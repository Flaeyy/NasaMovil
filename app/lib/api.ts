// lib/api.ts
const BASE_URL = 'https://jsonplaceholder.typicode.com';

export async function getPosts() {
  const res = await fetch(`${BASE_URL}/posts?_limit=20`);
  if (!res.ok) throw new Error('No se pudo cargar');
  return res.json() as Promise<Array<{ id: number; title: string }>>;
}

export async function getPost(id: string) {
  const res = await fetch(`${BASE_URL}/posts/${id}`);
  if (!res.ok) throw new Error('No se pudo cargar el detalle');
  return res.json() as Promise<{ id: number; title: string; body: string }>;
}
