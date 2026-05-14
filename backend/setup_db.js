import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { fileURLToPath } from 'url';

import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    throw new Error(`Змінна середовища ${name} не задана. Скопіюйте .env.example у .env і заповніть.`);
  }
  return v;
}

function assertSafeDbIdentifier(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(
      `Некоректне ім'я бази "${name}". Для безпеки використовуйте лише латинські літери, цифри та символ _.`,
    );
  }
}

function getDbConfig(overrides = {}) {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: requireEnv('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    ...overrides,
  };
}

async function connectServer() {
  return mysql.createConnection(getDbConfig());
}

async function connectDatabase() {
  const dbName = requireEnv('DB_NAME');
  return mysql.createConnection(
    getDbConfig({
      database: dbName,
      multipleStatements: true,
    }),
  );
}

async function databaseExists(conn, dbName) {
  const [rows] = await conn.query(
    'SELECT SCHEMA_NAME AS name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1',
    [dbName],
  );
  return rows.length > 0;
}

async function listTablesWithStats(conn, dbName) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME AS tableName, TABLE_ROWS AS approxRows
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [dbName],
  );
  return rows;
}

async function actionCheckState() {
  const dbName = requireEnv('DB_NAME');
  assertSafeDbIdentifier(dbName);

  const serverConn = await connectServer();
  try {
    const exists = await databaseExists(serverConn, dbName);
    if (!exists) {
      console.log(`\nБаза "${dbName}" не знайдена на сервері.\n`);
      return;
    }
    console.log(`\nБаза "${dbName}" існує.\n`);
  } finally {
    await serverConn.end();
  }

  const dbConn = await connectDatabase();
  try {
    const tables = await listTablesWithStats(dbConn, dbName);
    if (tables.length === 0) {
      console.log('Таблиць немає (порожня база).\n');
      return;
    }
    console.log('Таблиці (TABLE_ROWS — орієнтовно для InnoDB):\n');
    for (const t of tables) {
      console.log(`  - ${t.tableName}: ~${t.approxRows ?? 0} рядків`);
    }
    console.log('');
  } finally {
    await dbConn.end();
  }
}

function loadSchemaSql() {
  const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
  return fs.readFileSync(schemaPath, 'utf8');
}

async function tableCountInSchema(conn, dbName) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [dbName],
  );
  return Number(rows[0].c);
}

async function actionInit() {
  const dbName = requireEnv('DB_NAME');
  assertSafeDbIdentifier(dbName);

  const serverConn = await connectServer();
  try {
    await serverConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\`
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await serverConn.end();
  }

  const conn = await connectDatabase();
  try {
    const existing = await tableCountInSchema(conn, dbName);
    if (existing > 0) {
      console.log(
        `\nУ базі вже є таблиці (${existing}). Для чистої ініціалізації спочатку виконайте пункт меню «Видалити базу даних».\n`,
      );
      return;
    }

    const schemaSql = loadSchemaSql();
    await conn.query(schemaSql);

    const passwordHash = await bcrypt.hash('admin123', 10);
    await conn.query(
      `INSERT INTO users (login, password_hash, role) VALUES (?, ?, 'admin')`,
      ['admin', passwordHash],
    );

    await conn.query(
      `INSERT INTO tariffs (label, base_price, price_per_kg, price_per_km, is_active)
       VALUES ('default', 50.00, 8.0000, 5.0000, 1)`,
    );

    await conn.query(
      `INSERT INTO couriers (full_name, phone, available) VALUES
       ('Іваненко Петро', '+380501112233', 1),
       ('Коваленко Олена', '+380672223344', 1)`,
    );

    await conn.query(
      `INSERT INTO clients (name, phone, email) VALUES
       ('ТОВ «Приклад»', '+380443334455', 'office@example.test'),
       ('Приватна особа', '+380993334455', NULL)`,
    );

    console.log('\nБаза ініціалізована, таблиці створені, сід застосовано.');
    console.log('Тестовий адмін: логін admin, пароль admin123 (змініть у продакшені).\n');
  } finally {
    await conn.end();
  }
}

async function actionDropDatabase(rl) {
  const dbName = requireEnv('DB_NAME');
  assertSafeDbIdentifier(dbName);

  console.log(`\nУВАГА: буде видалено всю базу "${dbName}" та всі дані.`);
  const answer = await rl.question(`Введіть точну назву бази для підтвердження: `);
  if (answer.trim() !== dbName) {
    console.log('\nНазва не збіглась — операцію скасовано.\n');
    return;
  }

  const conn = await connectServer();
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    console.log(`\nБазу "${dbName}" видалено.\n`);
  } finally {
    await conn.end();
  }
}

async function mainMenu() {
  const rl = readline.createInterface({ input, output });

  try {
    // Перевірка .env на старті (крім випадку коли користувач лише читає help)
    requireEnv('DB_USER');
    assertSafeDbIdentifier(requireEnv('DB_NAME'));
  } catch (e) {
    console.error(`\n${e.message}\n`);
    rl.close();
    process.exitCode = 1;
    return;
  }

  while (true) {
    console.log('\n=== Налаштування бази даних (MVP) ===');
    console.log('1) Перевірити стан бази даних');
    console.log('2) Ініціалізувати базу даних (створити таблиці + сід)');
    console.log('3) Видалити базу даних');
    console.log('0) Вийти');

    const choice = (await rl.question('\nОберіть пункт: ')).trim();

    try {
      if (choice === '1') await actionCheckState();
      else if (choice === '2') await actionInit();
      else if (choice === '3') await actionDropDatabase(rl);
      else if (choice === '0') break;
      else console.log('\nНевідомий пункт меню.\n');
    } catch (err) {
      console.error('\nПомилка:', err.message || err);
      if (err.sqlMessage) console.error('SQL:', err.sqlMessage);
      console.log('');
    }
  }

  rl.close();
}

mainMenu();
