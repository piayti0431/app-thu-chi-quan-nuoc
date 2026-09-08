import { docDuLieu, luuDuLieu } from '../db.js';

export let state = null;

export async function initState() {
  state = await docDuLieu();
  return state;
}

export async function saveState() {
  if (state) {
    await luuDuLieu(state);
  }
}