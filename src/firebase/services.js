import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp,
  deleteDoc, limit
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from 'firebase/storage';
import { db, storage } from './config';

// ─── TOPICS ───────────────────────────────────────────────────────────────────

export const getTopics = async (filters = {}) => {
  let q = collection(db, 'topics');
  const constraints = [where('active', '==', true)];
  if (filters.category) constraints.push(where('category', '==', filters.category));
  q = query(q, ...constraints, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAllTopicsAdmin = async () => {
  const q = query(collection(db, 'topics'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createTopic = async (data) => {
  return addDoc(collection(db, 'topics'), {
    ...data,
    active: true,
    createdAt: serverTimestamp(),
  });
};

export const updateTopic = async (id, data) => {
  return updateDoc(doc(db, 'topics', id), data);
};

export const deleteTopic = async (id) => {
  return deleteDoc(doc(db, 'topics', id));
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export const createOrder = async (data) => {
  return addDoc(collection(db, 'orders'), {
    ...data,
    status: 'submitted',
    advancePaid: false,
    balancePaid: false,
    downloadUnlocked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getClientOrders = (clientId, callback) => {
  const q = query(
    collection(db, 'orders'),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const getAllOrders = (callback) => {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const getOrder = async (id) => {
  const snap = await getDoc(doc(db, 'orders', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateOrder = async (id, data) => {
  return updateDoc(doc(db, 'orders', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

export const sendMessage = async (orderId, data) => {
  return addDoc(collection(db, 'orders', orderId, 'messages'), {
    ...data,
    createdAt: serverTimestamp(),
    read: false,
  });
};

export const subscribeMessages = (orderId, callback) => {
  const q = query(
    collection(db, 'orders', orderId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const markMessagesRead = async (orderId, role) => {
  const q = query(
    collection(db, 'orders', orderId, 'messages'),
    where('senderRole', '!=', role),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const updates = snap.docs.map(d => updateDoc(d.ref, { read: true }));
  return Promise.all(updates);
};

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

export const recordPayment = async (orderId, paymentData) => {
  await addDoc(collection(db, 'orders', orderId, 'payments'), {
    ...paymentData,
    createdAt: serverTimestamp(),
  });
  const update = {};
  if (paymentData.type === 'advance') {
    update.advancePaid = true;
    update.advancePaidAt = serverTimestamp();
    update.status = 'in_progress';
  } else if (paymentData.type === 'balance') {
    update.balancePaid = true;
    update.balancePaidAt = serverTimestamp();
    update.downloadUnlocked = true;
    update.status = 'completed';
  }
  return updateOrder(orderId, update);
};

export const getPayments = async (orderId) => {
  const snap = await getDocs(collection(db, 'orders', orderId, 'payments'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────

export const uploadDeliverable = async (orderId, file, onProgress) => {
  const fileRef = ref(storage, `deliverables/${orderId}/${file.name}`);
  const task = uploadBytesResumable(fileRef, file);
  return new Promise((resolve, reject) => {
    task.on('state_changed',
      snap => onProgress && onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await updateOrder(orderId, {
          deliverableUrl: url,
          deliverableFileName: file.name,
          deliverableUploadedAt: serverTimestamp(),
          status: 'awaiting_final_payment',
        });
        resolve(url);
      }
    );
  });
};

// ─── USER PROFILES ────────────────────────────────────────────────────────────

export const createUserProfile = async (uid, data) => {
  return updateDoc(doc(db, 'users', uid), data).catch(() =>
    addDoc(collection(db, 'users'), { uid, ...data, createdAt: serverTimestamp() })
  );
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const upsertUserProfile = async (uid, data) => {
  const ref2 = doc(db, 'users', uid);
  const snap = await getDoc(ref2);
  if (snap.exists()) {
    return updateDoc(ref2, data);
  } else {
    return updateDoc(ref2, { uid, ...data, createdAt: serverTimestamp() })
      .catch(() => addDoc(collection(db, 'users'), { uid, ...data, createdAt: serverTimestamp() }));
  }
};
