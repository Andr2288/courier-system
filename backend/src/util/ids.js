export function parseIdParam(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Некоректний ідентифікатор.' });
    return null;
  }
  return id;
}
