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

/** Тариф «default» у сіді: збігається з першим активним записом для розрахунків. */
function seedCalculatedPrice(distanceKm, weightKg) {
  const base = 50;
  const perKg = 8;
  const perKm = 5;
  const raw = base + weightKg * perKg + distanceKm * perKm;
  return Math.round(raw * 100) / 100;
}

/**
 * Сід: по 8 записів для основних довідників і відправлень (діапазон 5–10).
 * route_logs — лише для консистентності статусів; ratings/complaints (відгуки) — точково для демо аналітики.
 */
async function insertSeedData(conn) {
  const adminHash = await bcrypt.hash('admin123', 10);
  const dispatchHash = await bcrypt.hash('dispatch123', 10);

  const dispatchLogins = [
    'dispatcher01',
    'dispatcher02',
    'dispatcher03',
    'dispatcher04',
    'dispatcher05',
    'dispatcher06',
    'dispatcher07',
  ];

  await conn.query(
    `INSERT INTO users (login, password_hash, role) VALUES (?, ?, 'admin')`,
    ['admin', adminHash],
  );
  for (const login of dispatchLogins) {
    await conn.query(`INSERT INTO users (login, password_hash, role) VALUES (?, ?, 'dispatcher')`, [
      login,
      dispatchHash,
    ]);
  }

  await conn.query(
    `INSERT INTO tariffs (label, base_price, price_per_kg, price_per_km, is_active) VALUES
     ('default', 50.00, 8.0000, 5.0000, 1),
     ('Економ', 35.00, 6.5000, 4.2000, 0),
     ('Стандарт+', 60.00, 9.0000, 5.5000, 0),
     ('Експрес', 90.00, 11.0000, 7.0000, 0),
     ('Нічний', 70.00, 8.0000, 6.0000, 0),
     ('Крихке', 55.00, 10.0000, 5.0000, 0),
     ('Зима 2025', 48.00, 7.5000, 4.8000, 0),
     ('Архів', 40.00, 7.0000, 4.5000, 0)`,
  );

  await conn.query(
    `INSERT INTO couriers (full_name, phone, available) VALUES
     ('Іваненко Петро', '380501112233', 1),
     ('Коваленко Олена', '380672223344', 1),
     ('Бондаренко Максим', '380631112200', 1),
     ('Мельник Ірина', '380501112201', 0),
     ('Шевченко Андрій', '380671112202', 1),
     ('Ткаченко Світлана', '380931112203', 1),
     ('Лисенко Олег', '380501112204', 0),
     ('Марченко Наталія', '380671112205', 1)`,
  );

  await conn.query(
    `INSERT INTO clients (name, phone, email) VALUES
     ('ТОВ «Приклад»', '380443334455', 'office@example.test'),
     ('Приватна особа', '380993334455', NULL),
     ('ФОП Гордієнко', '380501112300', 'gord@example.test'),
     ('ТОВ «Логіст Плюс»', '380442223300', 'ops@logist-plus.test'),
     ('ТОВ «АгроСхід»', '380672223311', NULL),
     ('Іванов Сергій', '380931112322', 'ivanov@example.test'),
     ('ТОВ «Медтех»', '380501112333', 'supply@medtech.test'),
     ('Крамаренко Людмила', '380671112344', NULL)`,
  );

  const shipmentsSpec = [
    {
      code: 'CV-SEED000001',
      clientId: 1,
      status: 'created',
      courierId: null,
      km: 10,
      weight: 1.2,
      L: 30,
      W: 20,
      H: 15,
      pickup: 'м. Київ, вул. Хрещатик, 1',
      delivery: 'м. Київ, просп. Перемоги, 45',
      deliveredAt: null,
      createdAt: '2026-04-01 09:00:00',
    },
    {
      code: 'CV-SEED000002',
      clientId: 2,
      status: 'created',
      courierId: null,
      km: 5.5,
      weight: 0.8,
      L: 25,
      W: 18,
      H: 12,
      pickup: 'м. Львів, вул. Городоцька, 120',
      delivery: 'м. Львів, вул. Стрийська, 88',
      deliveredAt: null,
      createdAt: '2026-04-02 10:15:00',
    },
    {
      code: 'CV-SEED000003',
      clientId: 3,
      status: 'assigned',
      courierId: 1,
      km: 18,
      weight: 3.5,
      L: 45,
      W: 35,
      H: 25,
      pickup: 'м. Одеса, вул. Дерибасівська, 14',
      delivery: 'м. Одеса, Фонтанська дорога, 90',
      deliveredAt: null,
      createdAt: '2026-04-03 11:00:00',
    },
    {
      code: 'CV-SEED000004',
      clientId: 4,
      status: 'assigned',
      courierId: 2,
      km: 22,
      weight: 2.1,
      L: 40,
      W: 30,
      H: 20,
      pickup: 'м. Харків, вул. Сумська, 40',
      delivery: 'м. Харків, просп. Науки, 15',
      deliveredAt: null,
      createdAt: '2026-04-04 08:30:00',
    },
    {
      code: 'CV-SEED000005',
      clientId: 5,
      status: 'in_transit',
      courierId: 3,
      km: 14,
      weight: 4.2,
      L: 50,
      W: 40,
      H: 30,
      pickup: 'м. Дніпро, вул. Яворницького, 52',
      delivery: 'м. Дніпро, вул. Набережна Перемоги, 33',
      deliveredAt: null,
      createdAt: '2026-04-05 12:00:00',
    },
    {
      code: 'CV-SEED000006',
      clientId: 6,
      status: 'in_transit',
      courierId: 5,
      km: 30,
      weight: 1.5,
      L: 35,
      W: 25,
      H: 18,
      pickup: 'м. Запоріжжя, просп. Соборний, 120',
      delivery: 'м. Запоріжжя, вул. Перемоги, 77',
      deliveredAt: null,
      createdAt: '2026-04-06 14:20:00',
    },
    {
      code: 'CV-SEED000007',
      clientId: 7,
      status: 'delivered',
      courierId: 6,
      km: 12,
      weight: 2.0,
      L: 38,
      W: 28,
      H: 22,
      pickup: 'м. Вінниця, вул. Соборна, 60',
      delivery: 'м. Вінниця, вул. Пирогова, 12',
      deliveredAt: '2026-03-28 16:00:00',
      createdAt: '2026-03-28 10:00:00',
    },
    {
      code: 'CV-SEED000008',
      clientId: 8,
      status: 'delivered',
      courierId: 8,
      km: 40,
      weight: 5.0,
      L: 60,
      W: 45,
      H: 35,
      pickup: 'м. Полтава, вул. Шевченка, 25',
      delivery: 'м. Полтава, вул. Європейська, 101',
      deliveredAt: '2026-03-20 18:30:00',
      createdAt: '2026-03-20 09:00:00',
    },
  ];

  for (const s of shipmentsSpec) {
    const price = seedCalculatedPrice(s.km, s.weight);
    await conn.query(
      `INSERT INTO shipments (
         client_id, tracking_code, address_pickup, address_delivery,
         distance_km, status, courier_id, calculated_price, delivered_at, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.clientId,
        s.code,
        s.pickup,
        s.delivery,
        s.km,
        s.status,
        s.courierId,
        price,
        s.deliveredAt,
        s.createdAt,
      ],
    );
  }

  const pkgRows = shipmentsSpec.map((s, i) => ({
    shipmentId: i + 1,
    L: s.L,
    W: s.W,
    H: s.H,
    weight: s.weight,
  }));
  for (const p of pkgRows) {
    await conn.query(
      `INSERT INTO packages (shipment_id, length_cm, width_cm, height_cm, weight_kg) VALUES (?, ?, ?, ?, ?)`,
      [p.shipmentId, p.L, p.W, p.H, p.weight],
    );
  }

  const logs = [
    { sid: 1, t: 'created', c: 'Відправлення створено', at: '2026-04-01 09:00:05' },
    { sid: 2, t: 'created', c: 'Відправлення створено', at: '2026-04-02 10:15:05' },
    { sid: 3, t: 'created', c: 'Відправлення створено', at: '2026-04-03 11:00:05' },
    { sid: 3, t: 'courier_assigned', c: 'Призначено кур’єра: Іваненко Петро', at: '2026-04-03 11:20:00' },
    { sid: 4, t: 'created', c: 'Відправлення створено', at: '2026-04-04 08:30:05' },
    { sid: 4, t: 'courier_assigned', c: 'Призначено кур’єра: Коваленко Олена', at: '2026-04-04 09:00:00' },
    { sid: 5, t: 'created', c: 'Відправлення створено', at: '2026-04-05 12:00:05' },
    { sid: 5, t: 'courier_assigned', c: 'Призначено кур’єра: Бондаренко Максим', at: '2026-04-05 12:10:00' },
    { sid: 5, t: 'picked_up', c: 'Посилку забрано, в дорозі', at: '2026-04-05 13:00:00' },
    { sid: 6, t: 'created', c: 'Відправлення створено', at: '2026-04-06 14:20:05' },
    { sid: 6, t: 'courier_assigned', c: 'Призначено кур’єра: Шевченко Андрій', at: '2026-04-06 14:35:00' },
    { sid: 6, t: 'picked_up', c: 'Посилку забрано, в дорозі', at: '2026-04-06 15:10:00' },
    { sid: 7, t: 'created', c: 'Відправлення створено', at: '2026-03-28 10:00:05' },
    { sid: 7, t: 'courier_assigned', c: 'Призначено кур’єра: Ткаченко Світлана', at: '2026-03-28 10:30:00' },
    { sid: 7, t: 'picked_up', c: 'Посилку забрано, в дорозі', at: '2026-03-28 14:00:00' },
    { sid: 7, t: 'delivered', c: 'Доставлено отримувачу', at: '2026-03-28 16:00:00' },
    { sid: 8, t: 'created', c: 'Відправлення створено', at: '2026-03-20 09:00:05' },
    { sid: 8, t: 'courier_assigned', c: 'Призначено кур’єра: Марченко Наталія', at: '2026-03-20 09:45:00' },
    { sid: 8, t: 'picked_up', c: 'Посилку забрано, в дорозі', at: '2026-03-20 12:00:00' },
    { sid: 8, t: 'delivered', c: 'Доставлено отримувачу', at: '2026-03-20 18:30:00' },
  ];

  for (const row of logs) {
    await conn.query(
      `INSERT INTO route_logs (shipment_id, event_type, comment, created_at) VALUES (?, ?, ?, ?)`,
      [row.sid, row.t, row.c, row.at],
    );
  }

  await conn.query(`INSERT INTO ratings (shipment_id, score) VALUES (7, 5), (8, 4)`);

  await conn.query(
    `INSERT INTO complaints (shipment_id, courier_id, body) VALUES
     (8, 8, 'Затримка на 45 хв без попередження (демо-відгук).'),
     (7, 6, 'Короткий коментар для перевірки списку відгуків.')`,
  );
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

    await insertSeedData(conn);

    console.log('\nБаза ініціалізована, таблиці створені, сід застосовано.');
    console.log('Облікові записи (змініть паролі у продакшені):');
    console.log('  admin / admin123 — роль admin');
    console.log('  dispatcher01 … dispatcher07 / dispatch123 — роль dispatcher');
    console.log('Сід: по 8 записів users (1 admin + 7 dispatcher), tariffs, couriers, clients, shipments+packages;');
    console.log('      route_logs для історії; 2 ratings та 2 відгуки (таблиця complaints) — демо для аналітики.\n');
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
