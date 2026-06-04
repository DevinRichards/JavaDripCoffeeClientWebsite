import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink } from 'react-router-dom';
import {
  cancelAdminOrder,
  confirmAdminOrder,
  createAdminCategory,
  createAdminGalleryCategory,
  createAdminGalleryItem,
  createAdminItem,
  deleteAdminGalleryCategory,
  deleteAdminGalleryItem,
  fetchAdminGallery,
  fetchAdminOrders,
  fetchAdminMenu,
  updateAdminCategory,
  updateAdminGalleryItem,
  updateAdminItem,
} from '../api';
import { useEmployee } from '../context/EmployeeContext';

const EMPTY_CATEGORY_FORM = { name: '', subtitle: '' };
const EMPTY_GALLERY_FORM = {
  title: '',
  category: 'Photos',
  media_type: 'photo',
  image_url: '',
  caption: '',
  active: true,
  sort_order: 0,
};
const EMPTY_GALLERY_CATEGORY_FORM = { name: '' };
const MAX_IMAGE_FILE_SIZE = 2 * 1024 * 1024;
const MAX_GALLERY_VIDEO_FILE_SIZE = 6 * 1024 * 1024;
const ORDER_POLL_INTERVAL_MS = 15000;
const ORDER_ALERTS_ENABLED_KEY = 'jd_admin_order_alerts_enabled';
const SEEN_ORDER_IDS_KEY = 'jd_admin_seen_order_ids';
const ACTIONABLE_ORDER_STATUSES = new Set(['pending_confirmation', 'pending_payment']);

function readStoredOrderIds() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(SEEN_ORDER_IDS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function persistSeenOrderIds(orderIds) {
  try {
    window.localStorage.setItem(SEEN_ORDER_IDS_KEY, JSON.stringify([...orderIds].slice(-250)));
  } catch {
    // Local storage can be unavailable in private browsing; alerts still work for the active session.
  }
}

function getActionableOrders(nextOrders) {
  return nextOrders.filter((order) => ACTIONABLE_ORDER_STATUSES.has(order.status));
}

function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return window.Notification.permission;
}

function showBrowserOrderNotification(newOrders) {
  if (!newOrders.length || getNotificationPermission() !== 'granted') return;

  const firstOrder = newOrders[0];
  const extraCount = newOrders.length - 1;
  const body = extraCount > 0
    ? `${firstOrder.customer_name} and ${extraCount} more pickup request${extraCount === 1 ? '' : 's'} need review.`
    : `${firstOrder.customer_name} has a pickup request waiting for review.`;

  try {
    new window.Notification('New Java Drip Coffee pickup order', {
      body,
      tag: 'java-drip-new-pickup-order',
      renotify: true,
    });
  } catch {
    // Browser notification failures should never block the admin queue.
  }
}

function playOrderChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1174, audioContext.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, audioContext.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.32);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.34);
    window.setTimeout(() => audioContext.close(), 500);
  } catch {
    // Some browsers require user interaction for audio; visual/browser alerts still cover the workflow.
  }
}

function createEmptyItem(categoryId = '') {
  return {
    category_id: categoryId,
    name: '',
    description: '',
    price: '0.00',
    image_url: '',
    badge: '',
    active: true,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that media file.'));
    reader.readAsDataURL(file);
  });
}

function normalizeItemForSave(item) {
  return {
    category_id: item.category_id,
    name: item.name,
    description: item.description,
    price: item.price,
    image_url: item.image_url,
    badge: item.badge,
    active: Boolean(item.active),
    sort_order: Number(item.sort_order) || 0,
  };
}

function normalizeGalleryForSave(item) {
  return {
    title: item.title,
    category: item.category,
    media_type: item.media_type,
    image_url: item.image_url,
    caption: item.caption,
    active: Boolean(item.active),
    sort_order: Number(item.sort_order) || 0,
  };
}

export default function AdminDashboard({ section = 'orders' }) {
  const {
    employee,
    token,
    loading: employeeLoading,
    isEmployeeSignedIn,
    passwordResetRecommended,
    signOut,
  } = useEmployee();

  const [menu, setMenu] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newCategory, setNewCategory] = useState(EMPTY_CATEGORY_FORM);
  const [newItem, setNewItem] = useState(createEmptyItem());
  const [orders, setOrders] = useState([]);
  const [galleryCategories, setGalleryCategories] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [newGalleryItem, setNewGalleryItem] = useState(EMPTY_GALLERY_FORM);
  const [newGalleryCategory, setNewGalleryCategory] = useState(EMPTY_GALLERY_CATEGORY_FORM);
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState('All Media');
  const [orderForms, setOrderForms] = useState({});
  const [orderNotice, setOrderNotice] = useState(null);
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    try {
      return window.localStorage.getItem(ORDER_ALERTS_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission);
  const seenOrderIdsRef = useRef(readStoredOrderIds());
  const initialOrdersLoadedRef = useRef(false);
  const isOrdersPage = section === 'orders';
  const isMenuPage = section === 'menu';
  const isGalleryPage = section === 'gallery';

  useEffect(() => {
    if (!token) return;

    setError('');

    if (isMenuPage) {
      setLoading(true);
      fetchAdminMenu(token)
      .then((menuResponse) => {
        setMenu(menuResponse.data);
        const firstCategoryId = menuResponse.data[0]?.id || '';
        setSelectedCategoryId((current) => current || firstCategoryId);
        setNewItem((current) => ({ ...current, category_id: current.category_id || firstCategoryId }));
      })
      .catch((err) => setError(err.message || 'Could not load the admin menu.'))
      .finally(() => {
        setLoading(false);
      });
    }

    if (isOrdersPage) {
      setLoadingOrders(true);
      fetchAdminOrders(token)
        .then((ordersResponse) => {
          updateOrdersState(ordersResponse.data, { initialLoad: true });
        })
        .catch((err) => setError(err.message || 'Could not load pickup orders.'))
        .finally(() => {
          setLoadingOrders(false);
        });
    }
    if (isGalleryPage) {
      setLoading(true);
      fetchAdminGallery(token)
        .then((galleryResponse) => {
          updateGalleryState(galleryResponse.data);
        })
        .catch((err) => setError(err.message || 'Could not load gallery media.'))
        .finally(() => {
          setLoading(false);
        });
    }
  }, [token, isMenuPage, isOrdersPage, isGalleryPage]);

  useEffect(() => {
    if (!token || !isOrdersPage) return undefined;

    const pollOrders = () => {
      fetchAdminOrders(token)
        .then((ordersResponse) => {
          updateOrdersState(ordersResponse.data);
        })
        .catch(() => {
          // Keep the existing queue visible; the next poll or manual navigation can recover.
        });
    };

    const intervalId = window.setInterval(pollOrders, ORDER_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') pollOrders();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, isOrdersPage]);

  useEffect(() => {
    if (!isOrdersPage) return undefined;

    const originalTitle = document.title;
    const actionableCount = getActionableOrders(orders).length;

    if (actionableCount > 0) {
      document.title = `(${actionableCount}) Java Drip Pickup Orders`;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [isOrdersPage, orders]);

  const selectedCategory = useMemo(
    () => menu.find((category) => category.id === selectedCategoryId) || menu[0] || null,
    [menu, selectedCategoryId]
  );
  const filteredGalleryItems = useMemo(() => (
    selectedGalleryCategory === 'All Media'
      ? galleryItems
      : galleryItems.filter((item) => item.category === selectedGalleryCategory)
  ), [galleryItems, selectedGalleryCategory]);

  useEffect(() => {
    if (selectedCategory && !newItem.category_id) {
      setNewItem((current) => ({ ...current, category_id: selectedCategory.id }));
    }
  }, [selectedCategory, newItem.category_id]);

  if (!employeeLoading && !isEmployeeSignedIn) {
    return <Navigate to="/admin/signin" replace />;
  }

  const updateMenuState = (nextMenu) => {
    setMenu(nextMenu);
    if (!selectedCategoryId && nextMenu[0]) {
      setSelectedCategoryId(nextMenu[0].id);
    }
  };

  const updateOrdersState = (nextOrders, options = {}) => {
    const actionableOrders = getActionableOrders(nextOrders);
    const seenOrderIds = seenOrderIdsRef.current;

    if (options.initialLoad || !initialOrdersLoadedRef.current) {
      actionableOrders.forEach((order) => seenOrderIds.add(order.id));
      persistSeenOrderIds(seenOrderIds);
      initialOrdersLoadedRef.current = true;
    } else {
      const newOrders = actionableOrders.filter((order) => !seenOrderIds.has(order.id));
      if (newOrders.length > 0) {
        setOrderNotice({
          count: newOrders.length,
          orders: newOrders,
          message: newOrders.length === 1
            ? `New pickup request from ${newOrders[0].customer_name}.`
            : `${newOrders.length} new pickup requests are waiting for review.`,
        });

        if (alertsEnabled) {
          showBrowserOrderNotification(newOrders);
          playOrderChime();
        }
      }

      actionableOrders.forEach((order) => seenOrderIds.add(order.id));
      persistSeenOrderIds(seenOrderIds);
    }

    setOrders(nextOrders);
    setOrderForms((current) => ({
      ...current,
      ...Object.fromEntries(nextOrders.map((order) => [order.id, {
        pickup_time: current[order.id]?.pickup_time ?? order.confirmation_pickup_time ?? order.pickup_time ?? '',
        admin_notes: current[order.id]?.admin_notes ?? order.admin_notes ?? '',
      }])),
    }));
  };

  const updateGalleryState = (payload) => {
    const nextCategories = payload?.categories || [];
    const nextItems = payload?.items || [];
    setGalleryCategories(nextCategories);
    setGalleryItems(nextItems);
    setNewGalleryItem((current) => ({
      ...current,
      category: nextCategories.some((category) => category.name === current.category)
        ? current.category
        : nextCategories[0]?.name || 'Photos',
    }));
    setSelectedGalleryCategory((current) => (
      current === 'All Media' || nextCategories.some((category) => category.name === current)
        ? current
        : 'All Media'
    ));
  };

  const enableOrderAlerts = async () => {
    let permission = getNotificationPermission();

    if (permission === 'default' && 'Notification' in window) {
      permission = await window.Notification.requestPermission();
    }

    setNotificationPermission(permission);
    setAlertsEnabled(true);
    try {
      window.localStorage.setItem(ORDER_ALERTS_ENABLED_KEY, 'true');
    } catch {
      // Non-fatal; the setting can still apply until refresh.
    }
    setSuccessMessage(permission === 'granted'
      ? 'Order alerts are enabled. New pickup requests will show a browser notification.'
      : 'In-panel order alerts are enabled. Browser notifications are not available or were not granted.');
  };

  const handleCategoryFieldChange = (categoryId, field, value) => {
    setMenu((current) => current.map((category) => (
      category.id === categoryId ? { ...category, [field]: value } : category
    )));
  };

  const handleItemFieldChange = (itemId, field, value) => {
    setMenu((current) => current.map((category) => ({
      ...category,
      items: category.items.map((item) => (
        item.id === itemId ? { ...item, [field]: value } : item
      )),
    })));
  };

  const handleExistingItemImageUpload = async (itemId, file) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      setError('Please choose an image under 2 MB so the menu stays fast.');
      return;
    }

    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      handleItemFieldChange(itemId, 'image_url', dataUrl);
      setSuccessMessage(`Image ready for upload. Save the item to publish it.`);
    } catch (err) {
      setError(err.message || 'Could not process that image file.');
    }
  };

  const handleNewItemImageUpload = async (file) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      setError('Please choose an image under 2 MB so the menu stays fast.');
      return;
    }

    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setNewItem((current) => ({ ...current, image_url: dataUrl }));
      setSuccessMessage('Image added to the new item draft.');
    } catch (err) {
      setError(err.message || 'Could not process that image file.');
    }
  };

  const handleNewGalleryMediaUpload = async (file) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_GALLERY_VIDEO_FILE_SIZE : MAX_IMAGE_FILE_SIZE;
    if (file.size > maxSize) {
      setError(isVideo
        ? 'Please choose a video under 6 MB so the gallery stays fast.'
        : 'Please choose an image under 2 MB so the gallery stays fast.');
      return;
    }

    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setNewGalleryItem((current) => ({
        ...current,
        media_type: isVideo ? 'video' : 'photo',
        image_url: dataUrl,
      }));
      setSuccessMessage(isVideo ? 'Gallery video added to the draft.' : 'Gallery image added to the draft.');
    } catch (err) {
      setError(err.message || 'Could not process that media file.');
    }
  };

  const handleExistingGalleryMediaUpload = async (galleryItemId, file) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_GALLERY_VIDEO_FILE_SIZE : MAX_IMAGE_FILE_SIZE;
    if (file.size > maxSize) {
      setError(isVideo
        ? 'Please choose a video under 6 MB so the gallery stays fast.'
        : 'Please choose an image under 2 MB so the gallery stays fast.');
      return;
    }

    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setGalleryItems((current) => current.map((item) => (
        item.id === galleryItemId ? { ...item, media_type: isVideo ? 'video' : 'photo', image_url: dataUrl } : item
      )));
      setSuccessMessage('Media ready for upload. Save the gallery item to publish it.');
    } catch (err) {
      setError(err.message || 'Could not process that media file.');
    }
  };

  const handleGalleryFieldChange = (galleryItemId, field, value) => {
    setGalleryItems((current) => current.map((item) => (
      item.id === galleryItemId ? { ...item, [field]: value } : item
    )));
  };

  const handleOrderFieldChange = (orderId, field, value) => {
    setOrderForms((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] || { pickup_time: '', admin_notes: '' }),
        [field]: value,
      },
    }));
  };

  const saveCategory = async (category) => {
    setSaving(`category-${category.id}`);
    setError('');
    setSuccessMessage('');
    try {
      const response = await updateAdminCategory(token, category.id, {
        name: category.name,
        subtitle: category.subtitle,
        sort_order: category.sort_order,
      });
      updateMenuState(response.data);
      setSuccessMessage(`Saved ${category.name}.`);
    } catch (err) {
      setError(err.message || 'Could not save the category.');
    } finally {
      setSaving('');
    }
  };

  const saveItem = async (item) => {
    setSaving(`item-${item.id}`);
    setError('');
    setSuccessMessage('');
    try {
      const response = await updateAdminItem(token, item.id, normalizeItemForSave(item));
      updateMenuState(response.data);
      setSuccessMessage(`Saved ${item.name}.`);
    } catch (err) {
      setError(err.message || 'Could not save the item.');
    } finally {
      setSaving('');
    }
  };

  const archiveItem = async (item) => {
    await saveItem({ ...item, active: !item.active });
  };

  const confirmOrder = async (orderId) => {
    setSaving(`order-${orderId}`);
    setError('');
    setSuccessMessage('');
    try {
      const formState = orderForms[orderId] || {};
      const response = await confirmAdminOrder(token, orderId, formState);
      updateOrdersState(response.data);
      setSuccessMessage(response.message || `Confirmed ${orderId}.`);
    } catch (err) {
      setError(err.message || 'Could not confirm the pickup order.');
    } finally {
      setSaving('');
    }
  };

  const cancelOrder = async (orderId) => {
    const confirmed = window.confirm('Cancel this pickup order and email the customer?');
    if (!confirmed) return;

    setSaving(`cancel-order-${orderId}`);
    setError('');
    setSuccessMessage('');
    try {
      const formState = orderForms[orderId] || {};
      const response = await cancelAdminOrder(token, orderId, {
        admin_notes: formState.admin_notes,
      });
      updateOrdersState(response.data);
      setSuccessMessage(response.message || `Canceled ${orderId}.`);
    } catch (err) {
      setError(err.message || 'Could not cancel the pickup order.');
    } finally {
      setSaving('');
    }
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    setSaving('new-category');
    setError('');
    setSuccessMessage('');
    try {
      const response = await createAdminCategory(token, newCategory);
      updateMenuState(response.data);
      const latestCategory = response.data[response.data.length - 1];
      if (latestCategory) {
        setSelectedCategoryId(latestCategory.id);
        setNewItem(createEmptyItem(latestCategory.id));
      }
      setNewCategory(EMPTY_CATEGORY_FORM);
      setSuccessMessage('New category created.');
    } catch (err) {
      setError(err.message || 'Could not create the category.');
    } finally {
      setSaving('');
    }
  };

  const handleCreateItem = async (event) => {
    event.preventDefault();
    setSaving('new-item');
    setError('');
    setSuccessMessage('');
    try {
      const response = await createAdminItem(token, {
        ...newItem,
        active: Boolean(newItem.active),
      });
      updateMenuState(response.data);
      setNewItem(createEmptyItem(newItem.category_id || selectedCategory?.id || ''));
      setSuccessMessage('New menu item created.');
    } catch (err) {
      setError(err.message || 'Could not create the menu item.');
    } finally {
      setSaving('');
    }
  };

  const handleCreateGalleryItem = async (event) => {
    event.preventDefault();
    setSaving('new-gallery-item');
    setError('');
    setSuccessMessage('');
    try {
      const response = await createAdminGalleryItem(token, normalizeGalleryForSave(newGalleryItem));
      updateGalleryState(response.data);
      setNewGalleryItem({
        ...EMPTY_GALLERY_FORM,
        category: galleryCategories[0]?.name || 'Photos',
      });
      setSuccessMessage('Gallery photo published.');
    } catch (err) {
      setError(err.message || 'Could not create the gallery item.');
    } finally {
      setSaving('');
    }
  };

  const handleCreateGalleryCategory = async (event) => {
    event.preventDefault();
    setSaving('new-gallery-category');
    setError('');
    setSuccessMessage('');
    try {
      const response = await createAdminGalleryCategory(token, newGalleryCategory);
      updateGalleryState(response.data);
      setSelectedGalleryCategory(newGalleryCategory.name.trim());
      setNewGalleryCategory(EMPTY_GALLERY_CATEGORY_FORM);
      setSuccessMessage('Gallery category created.');
    } catch (err) {
      setError(err.message || 'Could not create the gallery category.');
    } finally {
      setSaving('');
    }
  };

  const handleDeleteGalleryCategory = async (category) => {
    const confirmed = window.confirm(`Delete "${category.name}"? Photos in this category will move to Photos.`);
    if (!confirmed) return;

    setSaving(`delete-gallery-category-${category.id}`);
    setError('');
    setSuccessMessage('');
    try {
      const response = await deleteAdminGalleryCategory(token, category.id);
      updateGalleryState(response.data);
      setSelectedGalleryCategory('All Media');
      setSuccessMessage('Gallery category deleted.');
    } catch (err) {
      setError(err.message || 'Could not delete the gallery category.');
    } finally {
      setSaving('');
    }
  };

  const saveGalleryItem = async (item) => {
    setSaving(`gallery-${item.id}`);
    setError('');
    setSuccessMessage('');
    try {
      const response = await updateAdminGalleryItem(token, item.id, normalizeGalleryForSave(item));
      updateGalleryState(response.data);
      setSuccessMessage(`Saved ${item.title}.`);
    } catch (err) {
      setError(err.message || 'Could not save the gallery item.');
    } finally {
      setSaving('');
    }
  };

  const deleteGalleryItem = async (item) => {
    const confirmed = window.confirm(`Delete "${item.title}" from the gallery?`);
    if (!confirmed) return;

    setSaving(`delete-gallery-${item.id}`);
    setError('');
    setSuccessMessage('');
    try {
      const response = await deleteAdminGalleryItem(token, item.id);
      updateGalleryState(response.data);
      setSuccessMessage('Gallery item deleted.');
    } catch (err) {
      setError(err.message || 'Could not delete the gallery item.');
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-on-surface">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-10">
        <div className="bg-white rounded-[32px] shadow-editorial overflow-hidden border border-brand-charcoal/10">
          <div className="bg-[linear-gradient(135deg,_#303234_0%,_#44474a_40%,_#6b143f_100%)] text-white px-8 py-8 md:px-10 md:py-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div>
                <p className="font-label uppercase tracking-[0.24em] text-[11px] font-bold text-white/70 mb-3">Java Drip Coffee Staff</p>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">
                  {isOrdersPage ? 'Pickup Command Center' : isGalleryPage ? 'Gallery Studio' : 'Menu Control Room'}
                </h1>
                <p className="text-white/75 mt-4 max-w-2xl text-sm md:text-base leading-relaxed">
                  {isOrdersPage
                    ? 'Review paid pickup orders, confirm pickup timing, and notify customers when their order is ready.'
                    : isGalleryPage
                      ? 'Upload gallery photos, organize categories, and choose what appears on the public website.'
                      : 'Manage the public website menu, create new items, update prices, and keep categories organized.'}
                </p>
              </div>
              <div className="bg-white/10 border border-white/10 rounded-3xl px-6 py-5 min-w-[280px]">
                <p className="font-label uppercase tracking-widest text-[10px] font-bold text-white/60 mb-2">Signed in as</p>
                <p className="font-headline font-black text-2xl tracking-tight">{employee?.name}</p>
                <p className="text-white/70 text-sm mt-1">{employee?.email}</p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <Link
                    to="/menu"
                    className="bg-white/12 hover:bg-white/18 transition-colors rounded-full px-4 py-2 text-xs uppercase tracking-widest font-bold"
                  >
                    View Website
                  </Link>
                  <button
                    onClick={signOut}
                    className="bg-white text-brand-charcoal rounded-full px-4 py-2 text-xs uppercase tracking-widest font-bold"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>

          {passwordResetRecommended && (
            <div className="mx-8 mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 text-sm">
              This staff account should use a unique private password before the site goes live.
            </div>
          )}

          {error && (
            <div className="mx-8 mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mx-8 mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 text-sm">
              {successMessage}
            </div>
          )}

          {isOrdersPage && orderNotice && (
            <div className="mx-8 mt-6 rounded-3xl border border-primary/20 bg-primary/10 px-5 py-4 text-on-surface">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">New Pickup Alert</p>
                  <p className="mt-1 font-headline text-2xl font-black tracking-tight">{orderNotice.message}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {orderNotice.orders.map((order) => `${order.id} · ${order.customer_name}`).join(' | ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderNotice(null)}
                  className="rounded-full bg-white px-5 py-3 font-label text-xs font-bold uppercase tracking-widest text-on-surface shadow-sm"
                >
                  Mark Seen
                </button>
              </div>
            </div>
          )}

          <nav className="px-8 pt-8 flex flex-wrap gap-3" aria-label="Admin sections">
            {[
              { to: '/admin/orders', label: 'Pickup Orders' },
              { to: '/admin/menu', label: 'Menu Editor' },
              { to: '/admin/gallery', label: 'Gallery Media' },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `rounded-full px-5 py-3 text-xs uppercase tracking-widest font-label font-bold transition-colors ${
                  isActive || (item.to === '/admin/orders' && section === 'orders')
                    ? 'bg-brand-charcoal text-white'
                    : 'bg-white border border-brand-charcoal/10 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="px-8 py-8 grid grid-cols-1 xl:grid-cols-12 gap-8">
            {isOrdersPage && (
            <section className="xl:col-span-12 bg-[#faf8f2] border border-brand-charcoal/10 rounded-3xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                  <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Pickup Queue</p>
                  <h2 className="font-headline font-black text-3xl tracking-tight">Incoming Orders</h2>
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <div className="text-sm text-on-surface-variant">
                    Pending: <strong>{orders.filter((order) => order.status === 'pending_confirmation').length}</strong> · Awaiting payment: <strong>{orders.filter((order) => order.status === 'pending_payment').length}</strong> · Confirmed: <strong>{orders.filter((order) => order.status === 'confirmed').length}</strong> · Canceled: <strong>{orders.filter((order) => order.status === 'canceled').length}</strong>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-2 text-[10px] font-label font-bold uppercase tracking-widest ${
                      alertsEnabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {alertsEnabled ? 'Alerts On' : 'Alerts Off'}
                    </span>
                    <button
                      type="button"
                      onClick={enableOrderAlerts}
                      className="rounded-full bg-white px-4 py-2 text-[10px] font-label font-bold uppercase tracking-widest text-on-surface shadow-sm"
                    >
                      {alertsEnabled ? 'Refresh Alert Permission' : 'Enable Order Alerts'}
                    </button>
                    {notificationPermission === 'denied' && (
                      <span className="text-xs text-amber-700">
                        Browser notifications are blocked; in-panel alerts still work.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {loadingOrders ? (
                <div className="rounded-3xl bg-white border border-brand-charcoal/10 p-8 text-center text-on-surface-variant">
                  Loading pickup orders…
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-3xl bg-white border border-brand-charcoal/10 p-8 text-center text-on-surface-variant">
                  No pickup requests yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-3xl bg-white border border-brand-charcoal/10 p-6">
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <h3 className="font-headline font-black text-2xl tracking-tight">{order.id}</h3>
                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold ${
                              order.status === 'pending_confirmation'
                                ? 'bg-amber-100 text-amber-700'
                                : order.status === 'pending_payment'
                                  ? 'bg-sky-100 text-sky-700'
                                : order.status === 'canceled'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {order.status === 'pending_confirmation'
                                ? 'Awaiting Confirmation'
                                : order.status === 'pending_payment'
                                  ? 'Awaiting Online Payment'
                                : order.status === 'canceled'
                                  ? 'Canceled'
                                  : 'Confirmed'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold ${
                              order.payment_status === 'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.payment_status === 'pending'
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {order.payment_method === 'online'
                                ? order.payment_status === 'paid'
                                  ? 'Paid Online'
                                  : 'Square Pending'
                                : 'Payment Not Completed'}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface-variant">
                            <strong>{order.customer_name}</strong> · {order.customer_email} · {order.customer_phone || 'No phone'}
                          </p>
                          <p className="text-sm text-on-surface-variant mt-1">
                            Requested pickup: {order.pickup_time || 'Not specified'} · Location: {order.location_name || 'Website pickup'}
                          </p>
                          {order.notes && (
                            <p className="text-sm text-on-surface mt-3">
                              <strong>Customer note:</strong> {order.notes}
                            </p>
                          )}

                          <div className="mt-4 space-y-2">
                            {order.items.map((item) => (
                              <div key={item.id} className="rounded-2xl bg-[#faf8f2] px-4 py-3 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-bold">{item.quantity} × {item.item_name}</p>
                                    {item.addons?.length > 0 && (
                                      <p className="text-on-surface-variant mt-1">
                                        Add-ons: {item.addons.map((addon) => addon.name).join(', ')}
                                      </p>
                                    )}
                                  </div>
                                  <span className="font-bold">${((Number(item.item_price) + (item.addons?.reduce((sum, addon) => sum + Number(addon.price || 0), 0) || 0)) * item.quantity).toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="xl:w-[320px] rounded-3xl bg-brand-charcoal text-white p-5 space-y-4">
                          <div>
                            <p className="font-label uppercase tracking-widest text-[10px] font-bold text-white/60 mb-1">Estimated total</p>
                            <p className="font-headline font-black text-3xl">${Number(order.total).toFixed(2)}</p>
                            <p className="text-white/60 text-xs mt-1">
                              {order.payment_method === 'online'
                                ? order.payment_status === 'paid'
                                  ? 'Paid online through Square'
                                  : 'Waiting for Square payment'
                                : 'Payment not completed online'}
                            </p>
                          </div>

                          <input
                            value={orderForms[order.id]?.pickup_time || ''}
                            onChange={(event) => handleOrderFieldChange(order.id, 'pickup_time', event.target.value)}
                            placeholder="Confirmed pickup time"
                            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm"
                          />
                          <textarea
                            value={orderForms[order.id]?.admin_notes || ''}
                            onChange={(event) => handleOrderFieldChange(order.id, 'admin_notes', event.target.value)}
                            placeholder="Optional note for the customer"
                            rows={3}
                            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm resize-none"
                          />
                          <button
                            onClick={() => confirmOrder(order.id)}
                            disabled={saving === `order-${order.id}` || saving === `cancel-order-${order.id}` || order.status !== 'pending_confirmation'}
                            className="w-full rounded-2xl bg-white text-brand-charcoal font-label font-bold py-3 uppercase tracking-widest text-xs disabled:opacity-60"
                          >
                            {order.status === 'confirmed'
                              ? 'Already Confirmed'
                              : order.status === 'canceled'
                                ? 'Order Canceled'
                              : order.status === 'pending_payment'
                                ? 'Waiting For Payment'
                              : saving === `order-${order.id}`
                                ? 'Confirming…'
                                : 'Confirm Order + Email Customer'}
                          </button>
                          <button
                            onClick={() => cancelOrder(order.id)}
                            disabled={saving === `order-${order.id}` || saving === `cancel-order-${order.id}` || order.status === 'canceled'}
                            className="w-full rounded-2xl border border-rose-300/70 bg-rose-500/10 text-rose-100 font-label font-bold py-3 uppercase tracking-widest text-xs transition-colors hover:bg-rose-500/20 disabled:opacity-60"
                          >
                            {order.status === 'canceled'
                              ? 'Canceled'
                              : saving === `cancel-order-${order.id}`
                                ? 'Canceling…'
                                : 'Cancel Order + Email Customer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            )}

            {isGalleryPage && (
            <section className="xl:col-span-12 space-y-6">
              <div className="bg-white border border-brand-charcoal/10 rounded-3xl p-6 md:p-8">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6">
                  <div>
                    <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Gallery Categories</p>
                    <h2 className="font-headline font-black text-3xl tracking-tight">Choose A Gallery Tab</h2>
                  </div>
                  <form onSubmit={handleCreateGalleryCategory} className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={newGalleryCategory.name}
                      onChange={(event) => setNewGalleryCategory((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Events"
                      className="rounded-2xl bg-surface-container-high px-4 py-3"
                      required
                    />
                    <button
                      type="submit"
                      disabled={saving === 'new-gallery-category'}
                      className="rounded-2xl bg-brand-charcoal px-5 py-3 font-label text-xs font-bold uppercase tracking-widest text-white disabled:opacity-60"
                    >
                      {saving === 'new-gallery-category' ? 'Creating…' : 'Create Category'}
                    </button>
                  </form>
                </div>

                <div className="flex flex-wrap gap-3">
                  {['All Media', ...galleryCategories.map((category) => category.name)].map((categoryName) => (
                    <button
                      key={categoryName}
                      type="button"
                      onClick={() => setSelectedGalleryCategory(categoryName)}
                      className={`rounded-full px-5 py-3 text-xs uppercase tracking-widest font-label font-bold transition-colors ${
                        selectedGalleryCategory === categoryName
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {categoryName}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {galleryCategories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#faf8f2] px-4 py-3">
                      <div>
                        <p className="font-headline font-black tracking-tight">{category.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          {galleryItems.filter((item) => item.category === category.name).length} item{galleryItems.filter((item) => item.category === category.name).length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteGalleryCategory(category)}
                        disabled={category.name === 'Photos' || saving === `delete-gallery-category-${category.id}`}
                        className="rounded-full border border-rose-300/70 px-3 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#faf8f2] border border-brand-charcoal/10 rounded-3xl p-6 md:p-8">
                <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Add Gallery Media</p>
                <h2 className="font-headline font-black text-3xl tracking-tight mb-6">Upload Media</h2>
                <form onSubmit={handleCreateGalleryItem} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-4">
                    <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">Photo or Video</label>
                    <div className="rounded-[28px] border border-dashed border-brand-charcoal/20 bg-white p-4">
                      <div className="aspect-[4/3] overflow-hidden rounded-[22px] bg-surface-container flex items-center justify-center">
                        {newGalleryItem.image_url && newGalleryItem.media_type === 'video' ? (
                          <video src={newGalleryItem.image_url} controls className="h-full w-full object-cover" />
                        ) : newGalleryItem.image_url ? (
                          <img src={newGalleryItem.image_url} alt="New gallery preview" className="h-full w-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-5xl text-outline-variant">perm_media</span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          void handleNewGalleryMediaUpload(file);
                          event.target.value = '';
                        }}
                        className="mt-4 block w-full rounded-2xl bg-surface-container-high px-4 py-3 text-sm"
                        required={!newGalleryItem.image_url}
                      />
                      <p className="mt-2 text-xs text-on-surface-variant">Upload photos up to 2 MB or short videos up to 6 MB.</p>
                    </div>
                  </div>

                  <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
                    <input
                      value={newGalleryItem.title}
                      onChange={(event) => setNewGalleryItem((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Latte art morning"
                      className="rounded-2xl bg-white px-4 py-3"
                      required
                    />
                    <select
                      value={newGalleryItem.category}
                      onChange={(event) => setNewGalleryItem((current) => ({ ...current, category: event.target.value }))}
                      className="rounded-2xl bg-white px-4 py-3"
                    >
                      {galleryCategories.map((category) => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                    <input
                      value={newGalleryItem.sort_order}
                      onChange={(event) => setNewGalleryItem((current) => ({ ...current, sort_order: event.target.value }))}
                      placeholder="Sort order"
                      className="rounded-2xl bg-white px-4 py-3"
                    />
                    <select
                      value={newGalleryItem.media_type}
                      onChange={(event) => setNewGalleryItem((current) => ({ ...current, media_type: event.target.value }))}
                      className="rounded-2xl bg-white px-4 py-3"
                    >
                      <option value="photo">Photo</option>
                      <option value="video">Video</option>
                    </select>
                    <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={Boolean(newGalleryItem.active)}
                        onChange={(event) => setNewGalleryItem((current) => ({ ...current, active: event.target.checked }))}
                      />
                      Show on public gallery
                    </label>
                    <textarea
                      value={newGalleryItem.caption}
                      onChange={(event) => setNewGalleryItem((current) => ({ ...current, caption: event.target.value }))}
                      placeholder="Optional caption"
                      rows={4}
                      className="rounded-2xl bg-white px-4 py-3 resize-none md:col-span-2"
                    />
                    <button
                      type="submit"
                      disabled={saving === 'new-gallery-item'}
                      className="md:col-span-2 kinetic-gradient text-white font-label font-bold py-3 rounded-2xl uppercase tracking-widest text-xs disabled:opacity-60"
                    >
                      {saving === 'new-gallery-item' ? 'Publishing…' : 'Publish Gallery Media'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white border border-brand-charcoal/10 rounded-3xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                  <div>
                    <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Gallery Library</p>
                    <h2 className="font-headline font-black text-3xl tracking-tight">Uploaded Media</h2>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    Live: <strong>{galleryItems.filter((item) => item.active).length}</strong> · Hidden: <strong>{galleryItems.filter((item) => !item.active).length}</strong>
                  </p>
                </div>

                {loading ? (
                  <div className="rounded-3xl bg-surface-container-low p-10 text-center text-on-surface-variant">
                    Loading gallery media…
                  </div>
                ) : galleryItems.length === 0 ? (
                  <div className="rounded-3xl bg-surface-container-low p-10 text-center text-on-surface-variant">
                    No gallery media yet. Upload the first item above.
                  </div>
                ) : filteredGalleryItems.length === 0 ? (
                  <div className="rounded-3xl bg-surface-container-low p-10 text-center text-on-surface-variant">
                    No gallery media in {selectedGalleryCategory} yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {filteredGalleryItems.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-brand-charcoal/10 bg-[#faf8f2] p-5">
                        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
                          <div>
                            <div className="aspect-square overflow-hidden rounded-[24px] bg-surface-container">
                              {item.media_type === 'video' ? (
                                <video src={item.image_url} controls className="h-full w-full object-cover" />
                              ) : (
                                <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                void handleExistingGalleryMediaUpload(item.id, file);
                                event.target.value = '';
                              }}
                              className="mt-3 block w-full rounded-2xl bg-white px-3 py-2 text-xs"
                            />
                          </div>
                          <div className="space-y-3">
                            <input
                              value={item.title}
                              onChange={(event) => handleGalleryFieldChange(item.id, 'title', event.target.value)}
                              className="w-full rounded-2xl bg-white px-4 py-3 font-bold"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <select
                                value={item.category}
                                onChange={(event) => handleGalleryFieldChange(item.id, 'category', event.target.value)}
                                className="rounded-2xl bg-white px-4 py-3"
                              >
                                {galleryCategories.map((category) => (
                                  <option key={category.id} value={category.name}>{category.name}</option>
                                ))}
                              </select>
                              <input
                                value={item.sort_order || 0}
                                onChange={(event) => handleGalleryFieldChange(item.id, 'sort_order', event.target.value)}
                                className="rounded-2xl bg-white px-4 py-3"
                              />
                              <select
                                value={item.media_type || 'photo'}
                                onChange={(event) => handleGalleryFieldChange(item.id, 'media_type', event.target.value)}
                                className="col-span-2 rounded-2xl bg-white px-4 py-3"
                              >
                                <option value="photo">Photo</option>
                                <option value="video">Video</option>
                              </select>
                            </div>
                            <textarea
                              value={item.caption || ''}
                              onChange={(event) => handleGalleryFieldChange(item.id, 'caption', event.target.value)}
                              rows={3}
                              className="w-full rounded-2xl bg-white px-4 py-3 resize-none"
                            />
                            <label className="inline-flex items-center gap-3 text-sm text-on-surface-variant">
                              <input
                                type="checkbox"
                                checked={Boolean(item.active)}
                                onChange={(event) => handleGalleryFieldChange(item.id, 'active', event.target.checked)}
                              />
                              Show on public gallery
                            </label>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => saveGalleryItem(item)}
                                disabled={saving === `gallery-${item.id}`}
                                className="rounded-2xl bg-brand-charcoal px-5 py-3 font-label text-xs font-bold uppercase tracking-widest text-white disabled:opacity-60"
                              >
                                {saving === `gallery-${item.id}` ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteGalleryItem(item)}
                                disabled={saving === `delete-gallery-${item.id}`}
                                className="rounded-2xl border border-rose-300/70 px-5 py-3 font-label text-xs font-bold uppercase tracking-widest text-rose-700 disabled:opacity-60"
                              >
                                {saving === `delete-gallery-${item.id}` ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            )}

            {isMenuPage && (
            <>
            <aside className="xl:col-span-4 space-y-6">
              <section className="bg-[#faf8f2] border border-brand-charcoal/10 rounded-3xl p-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant">Sections</p>
                    <h2 className="font-headline font-black text-2xl tracking-tight">Menu Categories</h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {menu.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`w-full text-left rounded-2xl border px-4 py-4 transition-all ${
                        selectedCategory?.id === category.id
                          ? 'border-primary bg-primary/8 shadow-editorial'
                          : 'border-brand-charcoal/10 bg-white hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="font-headline font-black text-lg tracking-tight">{category.name}</span>
                        <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">{category.items.length} items</span>
                      </div>
                      <p className="text-sm text-on-surface-variant line-clamp-2">{category.subtitle || 'No subtitle yet.'}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-brand-charcoal/10 rounded-3xl p-6">
                <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Add Section</p>
                <h2 className="font-headline font-black text-2xl tracking-tight mb-5">New Category</h2>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <input
                    value={newCategory.name}
                    onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Late Night Specials"
                    className="w-full rounded-2xl bg-surface-container-high px-4 py-3"
                    required
                  />
                  <textarea
                    value={newCategory.subtitle}
                    onChange={(event) => setNewCategory((current) => ({ ...current, subtitle: event.target.value }))}
                    placeholder="Optional subtitle for the category tab"
                    rows={3}
                    className="w-full rounded-2xl bg-surface-container-high px-4 py-3 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={saving === 'new-category'}
                    className="w-full kinetic-gradient text-white font-label font-bold py-3 rounded-2xl uppercase tracking-widest text-xs disabled:opacity-60"
                  >
                    {saving === 'new-category' ? 'Creating…' : 'Create Category'}
                  </button>
                </form>
              </section>
            </aside>

            <section className="xl:col-span-8 space-y-6">
              <div className="bg-white border border-brand-charcoal/10 rounded-3xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-6">
                  <div>
                    <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Editing Category</p>
                    <h2 className="font-headline font-black text-3xl tracking-tight">{selectedCategory?.name || 'Choose a category'}</h2>
                  </div>
                </div>

                {selectedCategory ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">Category Name</label>
                      <input
                        value={selectedCategory.name}
                        onChange={(event) => handleCategoryFieldChange(selectedCategory.id, 'name', event.target.value)}
                        className="w-full rounded-2xl bg-surface-container-high px-4 py-3"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">Subtitle</label>
                      <input
                        value={selectedCategory.subtitle || ''}
                        onChange={(event) => handleCategoryFieldChange(selectedCategory.id, 'subtitle', event.target.value)}
                        className="w-full rounded-2xl bg-surface-container-high px-4 py-3"
                      />
                    </div>
                    <button
                      onClick={() => saveCategory(selectedCategory)}
                      disabled={saving === `category-${selectedCategory.id}`}
                      className="rounded-2xl bg-brand-charcoal text-white font-label font-bold py-3 uppercase tracking-widest text-xs disabled:opacity-60"
                    >
                      {saving === `category-${selectedCategory.id}` ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <p className="text-on-surface-variant">Create a category first to start managing menu items.</p>
                )}
              </div>

              <div className="bg-[#faf8f2] border border-brand-charcoal/10 rounded-3xl p-6 md:p-8">
                <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Add Drink</p>
                <h2 className="font-headline font-black text-3xl tracking-tight mb-6">Create Menu Item</h2>
                <form onSubmit={handleCreateItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={newItem.category_id}
                    onChange={(event) => setNewItem((current) => ({ ...current, category_id: event.target.value }))}
                    className="rounded-2xl bg-white px-4 py-3"
                    required
                  >
                    <option value="">Choose a category</option>
                    {menu.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <input
                    value={newItem.name}
                    onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Turbo Matcha"
                    className="rounded-2xl bg-white px-4 py-3"
                    required
                  />
                  <input
                    value={newItem.price}
                    onChange={(event) => setNewItem((current) => ({ ...current, price: event.target.value }))}
                    placeholder="6.50"
                    className="rounded-2xl bg-white px-4 py-3"
                    required
                  />
                  <input
                    value={newItem.badge}
                    onChange={(event) => setNewItem((current) => ({ ...current, badge: event.target.value }))}
                    placeholder="Optional badge"
                    className="rounded-2xl bg-white px-4 py-3"
                  />
                  <input
                    value={newItem.image_url}
                    onChange={(event) => setNewItem((current) => ({ ...current, image_url: event.target.value }))}
                    placeholder="Image URL"
                    className="rounded-2xl bg-white px-4 py-3 md:col-span-2"
                  />
                  <div className="md:col-span-2">
                    <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">
                      Upload Photo From Device
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        void handleNewItemImageUpload(file);
                        event.target.value = '';
                      }}
                      className="block w-full rounded-2xl bg-white px-4 py-3 text-sm"
                    />
                    <p className="text-xs text-on-surface-variant mt-2">
                      Upload JPG, PNG, WEBP, or GIF up to 2 MB. This will replace the image URL above.
                    </p>
                    {newItem.image_url && (
                      <img
                        src={newItem.image_url}
                        alt="New item preview"
                        className="mt-4 h-28 w-28 rounded-2xl object-cover border border-brand-charcoal/10"
                      />
                    )}
                  </div>
                  <textarea
                    value={newItem.description}
                    onChange={(event) => setNewItem((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Short description"
                    rows={3}
                    className="rounded-2xl bg-white px-4 py-3 resize-none md:col-span-2"
                  />
                  <label className="flex items-center gap-3 text-sm text-on-surface-variant md:col-span-2">
                    <input
                      type="checkbox"
                      checked={Boolean(newItem.active)}
                      onChange={(event) => setNewItem((current) => ({ ...current, active: event.target.checked }))}
                    />
                    Publish this item immediately
                  </label>
                  <button
                    type="submit"
                    disabled={saving === 'new-item'}
                    className="md:col-span-2 kinetic-gradient text-white font-label font-bold py-3 rounded-2xl uppercase tracking-widest text-xs disabled:opacity-60"
                  >
                    {saving === 'new-item' ? 'Creating…' : 'Add Menu Item'}
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                {loading && (
                  <div className="rounded-3xl bg-white border border-brand-charcoal/10 p-10 text-center text-on-surface-variant">
                    Loading the menu workspace…
                  </div>
                )}

                {!loading && selectedCategory?.items.map((item) => (
                  <div key={item.id} className="bg-white border border-brand-charcoal/10 rounded-3xl p-6 md:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">Name</label>
                          <input
                            value={item.name}
                            onChange={(event) => handleItemFieldChange(item.id, 'name', event.target.value)}
                            className="w-full rounded-2xl bg-surface-container-high px-4 py-3"
                          />
                        </div>
                        <div>
                          <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">Price</label>
                          <input
                            value={item.price}
                            onChange={(event) => handleItemFieldChange(item.id, 'price', event.target.value)}
                            className="w-full rounded-2xl bg-surface-container-high px-4 py-3"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">Description</label>
                          <textarea
                            value={item.description || ''}
                            onChange={(event) => handleItemFieldChange(item.id, 'description', event.target.value)}
                            rows={3}
                            className="w-full rounded-2xl bg-surface-container-high px-4 py-3 resize-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">Image URL</label>
                          <input
                            value={item.image_url || ''}
                            onChange={(event) => handleItemFieldChange(item.id, 'image_url', event.target.value)}
                            className="w-full rounded-2xl bg-surface-container-high px-4 py-3"
                          />
                          <div className="mt-3">
                            <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">
                              Upload Photo From Device
                            </label>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                void handleExistingItemImageUpload(item.id, file);
                                event.target.value = '';
                              }}
                              className="block w-full rounded-2xl bg-surface-container-high px-4 py-3 text-sm"
                            />
                            <p className="text-xs text-on-surface-variant mt-2">
                              Uploading from a device replaces the image URL field. Save the item after selecting the image.
                            </p>
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={`${item.name} preview`}
                                className="mt-4 h-28 w-28 rounded-2xl object-cover border border-brand-charcoal/10"
                              />
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">Badge</label>
                          <input
                            value={item.badge || ''}
                            onChange={(event) => handleItemFieldChange(item.id, 'badge', event.target.value)}
                            className="w-full rounded-2xl bg-surface-container-high px-4 py-3"
                          />
                        </div>
                        <div>
                          <label className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant block mb-2">Sort Order</label>
                          <input
                            value={item.sort_order || 0}
                            onChange={(event) => handleItemFieldChange(item.id, 'sort_order', event.target.value)}
                            className="w-full rounded-2xl bg-surface-container-high px-4 py-3"
                          />
                        </div>
                        <div className="md:col-span-2 flex flex-wrap items-center gap-4">
                          <label className="inline-flex items-center gap-3 text-sm text-on-surface-variant">
                            <input
                              type="checkbox"
                              checked={Boolean(item.active)}
                              onChange={(event) => handleItemFieldChange(item.id, 'active', event.target.checked)}
                            />
                            Show this item on the public website
                          </label>
                          <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold ${
                            item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'
                          }`}>
                            {item.active ? 'Live' : 'Archived'}
                          </span>
                        </div>
                      </div>

                      <div className="lg:w-[210px] flex flex-col gap-3">
                        <button
                          onClick={() => saveItem(item)}
                          disabled={saving === `item-${item.id}`}
                          className="rounded-2xl bg-brand-charcoal text-white font-label font-bold py-3 uppercase tracking-widest text-xs disabled:opacity-60"
                        >
                          {saving === `item-${item.id}` ? 'Saving…' : 'Save Item'}
                        </button>
                        <button
                          onClick={() => archiveItem(item)}
                          disabled={saving === `item-${item.id}`}
                          className="rounded-2xl border border-zinc-300 text-zinc-700 font-label font-bold py-3 uppercase tracking-widest text-xs"
                        >
                          {item.active ? 'Archive Item' : 'Restore Item'}
                        </button>
                        <Link
                          to="/checkout"
                          className="rounded-2xl kinetic-gradient text-white font-label font-bold py-3 uppercase tracking-widest text-xs text-center"
                        >
                          Preview Order Flow
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}

                {!loading && selectedCategory && selectedCategory.items.length === 0 && (
                  <div className="rounded-3xl bg-white border border-brand-charcoal/10 p-10 text-center text-on-surface-variant">
                    This category is empty. Add the first drink above.
                  </div>
                )}
              </div>
            </section>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
