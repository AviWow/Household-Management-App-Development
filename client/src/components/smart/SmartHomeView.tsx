import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { SmartDevice, LightColorTemp, SmartCredential } from '../../types';
import { apiSmartDevices } from '../../services/api';
import {
  Lightbulb,
  Power,
  Zap,
  Moon,
  Sun,
  Sliders,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  Settings,
  ExternalLink,
  Wifi,
  WifiOff,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Film
} from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'ענבר חמים', hex: '#FFA726', temp: 'warm' as LightColorTemp },
  { name: 'אור יום', hex: '#FFF3E0', temp: 'neutral' as LightColorTemp },
  { name: 'לבן קר', hex: '#E0F2FE', temp: 'cool' as LightColorTemp },
  { name: 'שקיעה רומנטית', hex: '#F43F5E', temp: 'warm' as LightColorTemp },
  { name: 'לבנדר מרגיע', hex: '#A855F7', temp: 'cool' as LightColorTemp },
  { name: 'טורקיז ים', hex: '#06B6D4', temp: 'cool' as LightColorTemp },
  { name: 'ירוק יער', hex: '#10B981', temp: 'neutral' as LightColorTemp },
];

const ROOM_OPTIONS = ['סלון', 'חדר שינה', 'מטבח', 'חדר ילדים', 'פינת אוכל', 'מרפסת', 'משרד'];

export const SmartHomeView: React.FC = () => {
  const { t, showToast } = useHousehold();
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [credentials, setCredentials] = useState<SmartCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomFilter, setRoomFilter] = useState<string>('all');

  // Modals state
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<SmartDevice | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [executingScene, setExecutingScene] = useState<string | null>(null);

  // Device Form state
  const [devName, setDevName] = useState('');
  const [devRoom, setDevRoom] = useState('סלון');
  const [devCustomRoom, setDevCustomRoom] = useState('');
  const [devRealId, setDevRealId] = useState('');

  // Tuya Cloud Credentials Form state
  const [tuyaClientId, setTuyaClientId] = useState('');
  const [tuyaClientSecret, setTuyaClientSecret] = useState('');
  const [tuyaRegion, setTuyaRegion] = useState('eu');
  const [tuyaTestDeviceId, setTuyaTestDeviceId] = useState('');

  const [testingCreds, setTestingCreds] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load devices and credentials
  const loadData = async () => {
    try {
      const [devList, credList] = await Promise.all([
        apiSmartDevices.list(),
        apiSmartDevices.getCredentials(),
      ]);
      setDevices(devList);
      setCredentials(credList);

      // Pre-fill existing credentials
      const tuyaCred = credList.find((c) => c.service === 'tuya');
      if (tuyaCred?.config) {
        setTuyaClientId(tuyaCred.config.clientId || '');
        setTuyaClientSecret(tuyaCred.config.clientSecret || '');
        setTuyaRegion(tuyaCred.config.region || 'eu');
      }
    } catch (err: any) {
      console.error('Failed to load smart home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Device Toggle
  const handleToggle = async (dev: SmartDevice) => {
    try {
      setDevices((prev) =>
        prev.map((d) => (d.id === dev.id ? { ...d, is_on: d.is_on ? 0 : 1 } : d))
      );
      const updated = await apiSmartDevices.toggle(dev.id);
      setDevices((prev) => prev.map((d) => (d.id === dev.id ? updated : d)));
      showToast(
        updated.is_on
          ? `${updated.name} ${t('הודלקה', 'turned on')}`
          : `${updated.name} ${t('כובתה', 'turned off')}`,
        'info'
      );
    } catch (err: any) {
      showToast(err.message || 'Error toggling device', 'error');
      loadData();
    }
  };

  // Device Settings Update (brightness, color, temp)
  const handleUpdateDevice = async (id: string, patch: Partial<SmartDevice>) => {
    try {
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
      const updated = await apiSmartDevices.set(id, patch);
      setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (err: any) {
      showToast(err.message || 'Error updating device', 'error');
      loadData();
    }
  };

  // Master Scene Trigger
  const handleRunScene = async (sceneName: string, label: string) => {
    try {
      setExecutingScene(sceneName);
      const updatedList = await apiSmartDevices.runScene(sceneName);
      setDevices(updatedList);
      showToast(`${t('תרחיש', 'Scene')} "${label}" ${t('הופעל בהצלחה!', 'activated!')}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error executing scene', 'error');
    } finally {
      setExecutingScene(null);
    }
  };

  // Open Add Device Modal
  const handleOpenAddDevice = () => {
    setEditingDevice(null);
    setDevName('');
    setDevRoom('סלון');
    setDevCustomRoom('');
    setDevRealId('');
    setShowDeviceModal(true);
  };

  // Open Edit Device Modal
  const handleOpenEditDevice = (dev: SmartDevice) => {
    setEditingDevice(dev);
    setDevName(dev.name);
    if (ROOM_OPTIONS.includes(dev.room)) {
      setDevRoom(dev.room);
      setDevCustomRoom('');
    } else {
      setDevRoom('אחר');
      setDevCustomRoom(dev.room);
    }
    setDevRealId(dev.real_device_id || '');
    setShowDeviceModal(true);
  };

  // Save Device (Create or Update)
  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devName.trim()) return;

    const finalRoom = devRoom === 'אחר' ? devCustomRoom.trim() || 'כללי' : devRoom;

    try {
      if (editingDevice) {
        const updated = await apiSmartDevices.update(editingDevice.id, {
          name: devName.trim(),
          room: finalRoom,
          real_device_id: devRealId.trim() || null,
        });
        setDevices((prev) => prev.map((d) => (d.id === editingDevice.id ? updated : d)));
        showToast(t('פרטי המנורה עודכנו בהצלחה!', 'Device updated successfully!'), 'success');
      } else {
        const created = await apiSmartDevices.create({
          name: devName.trim(),
          device_type: 'volcano_light',
          room: finalRoom,
          real_device_id: devRealId.trim() || null,
        });
        setDevices((prev) => [...prev, created]);
        showToast(t('מנורה חדשה נוספה בהצלחה!', 'New device added!'), 'success');
      }
      setShowDeviceModal(false);
    } catch (err: any) {
      showToast(err.message || 'Error saving device', 'error');
    }
  };

  // Delete Device
  const handleDeleteDevice = async (dev: SmartDevice) => {
    if (!confirm(t(`האם למחוק את המנורה "${dev.name}"?`, `Delete device "${dev.name}"?`))) return;

    try {
      await apiSmartDevices.delete(dev.id);
      setDevices((prev) => prev.filter((d) => d.id !== dev.id));
      showToast(t('המנורה נמחקה בהצלחה', 'Device deleted'), 'info');
    } catch (err: any) {
      showToast(err.message || 'Error deleting device', 'error');
    }
  };

  // Save & Test Cloud Credentials
  const handleSaveCredentials = async () => {
    setTestingCreds(true);
    setTestResult(null);

    const config = {
      clientId: tuyaClientId,
      clientSecret: tuyaClientSecret,
      region: tuyaRegion,
    };

    try {
      const res = await apiSmartDevices.saveCredentials('tuya', config, tuyaTestDeviceId);
      setTestResult({ success: res.is_connected === 1, message: res.message });
      if (res.is_connected === 1) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'warning');
      }
      loadData();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection failed' });
      showToast(err.message || 'Failed to save credentials', 'error');
    } finally {
      setTestingCreds(false);
    }
  };

  const tuyaCred = credentials.find((c) => c.service === 'tuya');

  const rooms = ['all', ...Array.from(new Set(devices.map((d) => d.room)))];
  const filteredDevices =
    roomFilter === 'all' ? devices : devices.filter((d) => d.room === roomFilter);

  const totalPower = devices.reduce((sum, d) => sum + (d.is_on ? d.power_watt || 0 : 0), 0);
  const activeCount = devices.filter((d) => d.is_on).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-3">
              <Zap size={14} className="text-amber-400" />
              <span>{t('תאורה חכמה מקושרת', 'Connected Smart Lighting')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <span>{t('שליטה בתאורת Volcano', 'Volcano Smart Lighting')}</span>
              <span className="text-amber-400 text-xl">💡</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              {t(
                'שליטה ישירה במנורות חכמות של וולקנו (Volcano Smart Life / Tuya) – עוצמת תאורה, גוון אור טבעי (חם/קר) וצבעי אווירה RGB.',
                'Direct control of Volcano Smart Life lights – dimming, color temperatures, and RGB colors.'
              )}
            </p>

            {/* Cloud Connection Badge */}
            <div className="flex items-center gap-2.5 mt-3 flex-wrap">
              <span
                onClick={() => setShowSettingsModal(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-transform hover:scale-105 ${
                  tuyaCred?.is_connected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/10 text-slate-300 border border-white/10 hover:bg-white/15'
                }`}
                title="לחץ להגדרת חיבור Volcano / Smart Life"
              >
                {tuyaCred?.is_connected ? <Wifi size={13} className="text-emerald-400" /> : <WifiOff size={13} />}
                <span>{tuyaCred?.is_connected ? 'Volcano (Smart Life): מחובר לענן' : 'Volcano: לחץ לחיבור ענן'}</span>
              </span>
            </div>
          </div>

          {/* Action & Metric Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[95px]">
              <span className="block text-[11px] text-slate-300 font-medium">
                {t('מנורות דולקות', 'Active Lights')}
              </span>
              <span className="text-xl font-black text-amber-300">{activeCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[110px]">
              <span className="block text-[11px] text-slate-300 font-medium">
                {t('צריכה נוכחית', 'Current Power')}
              </span>
              <span className="text-xl font-black text-emerald-400">
                {totalPower.toLocaleString()} <span className="text-xs font-normal">W</span>
              </span>
            </div>

            {/* Real Connection Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Settings size={16} />
              <span>{t('חיבור ענן Smart Life', 'Smart Life Connection')}</span>
            </button>
          </div>
        </div>

        {/* Master Quick Lighting Scenes Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10">
          <span className="text-xs font-bold text-slate-300 block mb-2.5">
            {t('תרחישי תאורה מהירים לכל הבית:', 'Quick Lighting Scenes:')}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => handleRunScene('all_off', t('כיבוי הכל', 'All Off'))}
              disabled={executingScene !== null}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-rose-500/20 border border-white/15 hover:border-rose-400/40 text-slate-200 hover:text-rose-200 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Power size={15} className="text-rose-400" />
              <span>{t('כיבוי כל התאורה', 'All Lights Off')}</span>
            </button>

            <button
              onClick={() => handleRunScene('good_morning', t('בוקר טוב', 'Good Morning'))}
              disabled={executingScene !== null}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-amber-500/20 border border-white/15 hover:border-amber-400/40 text-slate-200 hover:text-amber-200 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Sun size={15} className="text-amber-300" />
              <span>{t('בוקר טוב (תאורת יום 85%)', 'Good Morning')}</span>
            </button>

            <button
              onClick={() => handleRunScene('relax', t('ערב רגוע', 'Evening Relax'))}
              disabled={executingScene !== null}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-amber-500/20 border border-white/15 hover:border-amber-400/40 text-slate-200 hover:text-amber-200 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Film size={15} className="text-amber-400" />
              <span>{t('ערב נעים (אור חמים 40%)', 'Evening Relax')}</span>
            </button>

            <button
              onClick={() => handleRunScene('good_night', t('לילה טוב', 'Good Night'))}
              disabled={executingScene !== null}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-indigo-500/20 border border-white/15 hover:border-indigo-400/40 text-slate-200 hover:text-indigo-200 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Moon size={15} className="text-indigo-300" />
              <span>{t('מצב לילה (עמעום 10%)', 'Night Mode')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Room Filter & Add Device Button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {rooms.map((room) => (
            <button
              key={room}
              onClick={() => setRoomFilter(room)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                roomFilter === room
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              {room === 'all' ? t('כל החדרים', 'All Rooms') : room}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Add Device Button */}
          <button
            onClick={handleOpenAddDevice}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('הוסף מנורת Volcano', 'Add Smart Light')}</span>
          </button>

          <button
            onClick={loadData}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl transition-colors cursor-pointer"
            title={t('רענן מצב מנורות', 'Refresh')}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredDevices.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3 text-3xl font-bold">
            💡
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {t('אין מנורות להצגה בחדר זה', 'No lights found in this room')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {t('לחץ על כפתור "הוסף מנורת Volcano" כדי להוסיף מנורה חכמה בסלון, בחדר השינה או בפינת האוכל.', 'Click Add Smart Light to add your Volcano bulbs.')}
          </p>
          <button
            onClick={handleOpenAddDevice}
            className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>{t('הוסף מנורה עכשיו', 'Add Light Now')}</span>
          </button>
        </div>
      )}

      {/* Lights Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredDevices.map((device) => (
          <VolcanoLightCard
            key={device.id}
            device={device}
            onToggle={() => handleToggle(device)}
            onUpdate={(patch) => handleUpdateDevice(device.id, patch)}
            onEdit={() => handleOpenEditDevice(device)}
            onDelete={() => handleDeleteDevice(device)}
          />
        ))}
      </div>

      {/* ========================================================================= */}
      {/* ➕ ADD / EDIT VOLCANO LIGHT MODAL                                          */}
      {/* ========================================================================= */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>💡</span>
                <span>{editingDevice ? t('עריכת מנורת Volcano', 'Edit Volcano Light') : t('הוספת מנורת Volcano חכמה', 'Add Volcano Smart Light')}</span>
              </h3>
              <button
                onClick={() => setShowDeviceModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="space-y-4 pt-4">
              {/* Device Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('שם המנורה', 'Light Name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="לדוגמה: מנורת סלון ראשית, מנורת עמידה..."
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                />
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('חדר / מיקום', 'Room / Location')} *
                </label>
                <select
                  value={devRoom}
                  onChange={(e) => setDevRoom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white mb-2"
                >
                  {ROOM_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="אחר">אחר (הקלד שם חדר...)</option>
                </select>

                {devRoom === 'אחר' && (
                  <input
                    type="text"
                    required
                    placeholder="הקלד שם חדר (לדוגמה: עליית גג, חצר...)"
                    value={devCustomRoom}
                    onChange={(e) => setDevCustomRoom(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                )}
              </div>

              {/* Real Hardware ID Link */}
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wifi size={14} className="text-amber-600" />
                    <span>{t('מזהה מנורה באפליקציית Smart Life (Device ID)', 'Device ID')}</span>
                  </label>
                  <span className="text-[10px] text-slate-400">אופציונלי</span>
                </div>
                <input
                  type="text"
                  placeholder="לדוגמה: eb5a7123984..."
                  value={devRealId}
                  onChange={(e) => setDevRealId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
                <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                  באפליקציית Smart Life: היכנסו למנורת Volcano ➔ סמל עיפרון ✏️ בפינה העליונה ➔ <strong>Device Information</strong> ➔ העתיקו את ה-<strong>Device ID</strong>.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
                >
                  {editingDevice ? t('שמור שינויים', 'Save Changes') : t('הוסף מנורה', 'Add Light')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="py-3 px-5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
                >
                  {t('ביטול', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚙️ REAL TUYA / SMART LIFE CLOUD CREDENTIALS MODAL                         */}
      {/* ========================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span>💡</span>
                  <span>{t('חיבור מנורות Volcano לענן Smart Life', 'Smart Life Connection')}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('חיבור ישיר לענן של Tuya / Smart Life לשליטה פיזית במנורות', 'Direct Tuya Cloud connection')}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setTestResult(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Test Result Message Box */}
            {testResult && (
              <div
                className={`p-3.5 rounded-2xl my-4 text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResult.success ? 'חיבור ענן תקין!' : 'שגיאה בחיבור'}</div>
                  <div className="mt-0.5 leading-relaxed">{testResult.message}</div>
                </div>
              </div>
            )}

            {/* TUYA / SMART LIFE FORM */}
            <div className="space-y-4 pt-4">
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-amber-950 text-xs leading-relaxed">
                💡 <strong>איך משיגים את מפתחות ה-API בחינם (ב-2 דקות)?</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1.5 text-[11px]">
                  <li>
                    היכנסו לאתר המפתחים הרשמי של Tuya / Smart Life: 
                    <a href="https://iot.tuya.com" target="_blank" rel="noreferrer" className="underline font-bold mr-1 text-indigo-700">
                      iot.tuya.com <ExternalLink size={10} className="inline" />
                    </a>
                  </li>
                  <li>פתחו חשבון חינמי (Sign Up) והיכנסו לדשבורד.</li>
                  <li>לחצו בתפריט על <strong>Cloud ➔ Development ➔ Create Cloud Project</strong>.</li>
                  <li>
                    בלשונית <strong>Devices ➔ Link Tuya App Account</strong>, סירקו את קוד ה-QR עם אפליקציית <strong>Smart Life</strong> בסמארטפון (תחת מסך "אני / Me" ➔ סמל סריקת QR למעלה).
                  </li>
                  <li>
                    העתיקו מלשונית <strong>Project Overview</strong> את ה-<strong>Access ID/Client ID</strong> ואת ה-<strong>Access Secret</strong> והדביקו כאן!
                  </li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Access ID / Client ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="לדוגמה: x73kda9..."
                  value={tuyaClientId}
                  onChange={(e) => setTuyaClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Access Secret / Client Secret *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••••••"
                  value={tuyaClientSecret}
                  onChange={(e) => setTuyaClientSecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    אזור שרת (Data Center)
                  </label>
                  <select
                    value={tuyaRegion}
                    onChange={(e) => setTuyaRegion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                  >
                    <option value="eu">אירופה וישראל (Europe - eu)</option>
                    <option value="us">אמריקה (Western US - us)</option>
                    <option value="cn">סין (China - cn)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Device ID לבדיקה (אופציונלי)
                  </label>
                  <input
                    type="text"
                    placeholder="מזהה מנורת Volcano"
                    value={tuyaTestDeviceId}
                    onChange={(e) => setTuyaTestDeviceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveCredentials}
                disabled={testingCreds || !tuyaClientId || !tuyaClientSecret}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                {testingCreds ? 'בודק ומחבר מול שרתי Smart Life...' : 'שמור ובדוק חיבור למנורות Volcano'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------------------
 * 💡 VOLCANO LIGHT CARD
 * ------------------------------------------------------------------------------------- */
interface LightCardProps {
  device: SmartDevice;
  onToggle: () => void;
  onUpdate: (patch: Partial<SmartDevice>) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const VolcanoLightCard: React.FC<LightCardProps> = ({
  device,
  onToggle,
  onUpdate,
  onEdit,
  onDelete,
}) => {
  const { t } = useHousehold();

  const applyPreset = (brightness: number, temp: LightColorTemp, hex: string) => {
    onUpdate({
      is_on: 1,
      brightness,
      color_temp: temp,
      color_hex: hex,
    });
  };

  return (
    <div
      className={`rounded-3xl border-2 transition-all duration-300 p-6 flex flex-col justify-between ${
        device.is_on
          ? 'bg-gradient-to-br from-amber-50/70 via-white to-slate-50 border-amber-300 shadow-lg shadow-amber-500/10'
          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
                device.is_on ? 'text-white shadow-md' : 'bg-slate-100 text-slate-400'
              }`}
              style={{
                backgroundColor: device.is_on ? device.color_hex || '#FFA726' : undefined,
                boxShadow: device.is_on
                  ? `0 6px 20px -3px ${device.color_hex || '#FFA726'}66`
                  : undefined,
              }}
            >
              <Lightbulb size={24} className={device.is_on ? 'fill-white' : ''} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {device.room}
                </span>
                {device.real_device_id ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Wifi size={10} />
                    <span>ID: {device.real_device_id}</span>
                  </span>
                ) : (
                  <span
                    onClick={onEdit}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 cursor-pointer hover:bg-amber-200"
                  >
                    + קשר מנורה פיזית
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-slate-800 mt-1 truncate">{device.name}</h3>
            </div>
          </div>

          {/* Action Buttons: Edit, Delete, Power Switch */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              title={t('ערוך מנורה', 'Edit Light')}
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title={t('מחק מנורה', 'Delete Light')}
            >
              <Trash2 size={15} />
            </button>

            <button
              onClick={onToggle}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                device.is_on
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/30 scale-105 active:scale-95'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={device.is_on ? t('כבה מנורה', 'Turn Off') : t('הדלק מנורה', 'Turn On')}
            >
              <Power size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Dimmer Slider */}
        <div className="mb-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sliders size={14} className="text-slate-400" />
              <span>{t('עוצמת בהירות', 'Brightness')}</span>
            </span>
            <span className="text-xs font-black text-slate-800">
              {device.is_on ? `${device.brightness}%` : t('כבויה', 'Off')}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={device.brightness}
            onChange={(e) => onUpdate({ brightness: Number(e.target.value), is_on: 1 })}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
        </div>

        {/* Color Temperature Selector */}
        <div className="mb-4">
          <span className="text-xs font-bold text-slate-600 block mb-2">
            {t('גוון אור (טמפרטורת צבע):', 'Color Temperature:')}
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onUpdate({ color_temp: 'warm', color_hex: '#FFA726', is_on: 1 })}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                device.color_temp === 'warm' && device.is_on
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>🟡</span>
              <span>{t('חם (2700K)', 'Warm')}</span>
            </button>

            <button
              onClick={() => onUpdate({ color_temp: 'neutral', color_hex: '#FFF3E0', is_on: 1 })}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                device.color_temp === 'neutral' && device.is_on
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>⚪</span>
              <span>{t('טבעי (4000K)', 'Neutral')}</span>
            </button>

            <button
              onClick={() => onUpdate({ color_temp: 'cool', color_hex: '#E0F2FE', is_on: 1 })}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                device.color_temp === 'cool' && device.is_on
                  ? 'bg-sky-100 text-sky-900 border border-sky-300 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>🔵</span>
              <span>{t('קר (6500K)', 'Cool')}</span>
            </button>
          </div>
        </div>

        {/* Color Palette Dots */}
        <div className="mb-4">
          <span className="text-xs font-bold text-slate-600 block mb-2">
            {t('צבעי אווירה (Volcano RGB):', 'Atmosphere Colors:')}
          </span>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.hex}
                onClick={() => onUpdate({ color_hex: p.hex, color_temp: p.temp, is_on: 1 })}
                className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center flex-shrink-0 cursor-pointer ${
                  device.color_hex === p.hex && device.is_on
                    ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-sm'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: p.hex }}
                title={p.name}
              >
                {device.color_hex === p.hex && device.is_on && (
                  <Check size={12} className="text-slate-800" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Atmosphere Quick Presets */}
      <div className="pt-3 border-t border-slate-100/80">
        <span className="text-[11px] font-bold text-slate-400 block mb-2">
          {t('מצבים מהירים:', 'Quick Modes:')}
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => applyPreset(100, 'neutral', '#FFF3E0')}
            className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
          >
            📖 {t('קריאה', 'Reading')}
          </button>
          <button
            onClick={() => applyPreset(40, 'warm', '#FFA726')}
            className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
          >
            🍿 {t('ערב נעים', 'Relax')}
          </button>
          <button
            onClick={() => applyPreset(10, 'warm', '#F43F5E')}
            className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
          >
            🌙 {t('מצב לילה', 'Night')}
          </button>
        </div>
      </div>
    </div>
  );
};
