/** Convert a Mongoose document to a plain API object with string `id`. */
export function toJSON(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  obj.id = String(obj._id);
  delete obj._id;
  delete obj.__v;
  if (obj.password_hash !== undefined) delete obj.password_hash;
  return obj;
}

export function toJSONList(docs) {
  return (docs ?? []).map(toJSON);
}
