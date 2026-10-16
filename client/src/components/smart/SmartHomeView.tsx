import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { SmartDevice, LightColorTemp, SmartCredential, SmartDeviceType } from '../../types';
import { apiSmartDevices } from '../../services/api';
import {
  Flame,
  Lightbulb,
  Power,
  Clock,
  Thermometer,
  Zap,
  Moon,
  ShowerHead,
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
  HelpCircle
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

const ROOM_OPTIONS = ['סלון', 'חדר שינה', 'חדר רחצה ראשי', 'מטבח', 'חדר ילדים', 'מרפסת', 'משרד'];

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
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [executingScene, setExecutingScene] = useState<string | null>(null);

  // Device Form state
  const [devName, setDevName] = useState('');
  const [devType, setDevType] = useState<SmartDeviceType>('volcano_light');
  const [devRoom, setDevRoom] = useState('סלון');
  const [devCustomRoom, setDevCustomRoom] = useState('');
  const [devRealId, setDevRealId] = useState('');
  const [devTimerMins, setDevTimerMins] = useState(30);

  // Cloud Credentials Form state
  const [credTab, setCredTab] = useState<'tuya' | 'switcher'>('tuya');
  const [tuyaClientId, setTuyaClientId] = useState('');
  const [tuyaClientSecret, setTuyaClientSecret] = useState('');
  const [tuyaRegion, setTuyaRegion] = useState('eu');
  const [tuyaTestDeviceId, setTuyaTestDeviceId] = useState('');

  const [switcherPhone, setSwitcherPhone] = useState('');
  const [switcherPassword, setSwitcherPassword] = useState('');
  const [switcherToken, setSwitcherToken] = useState('');
  const [switcherWebhook, setSwitcherWebhook] = useState('');

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

      const switcherCred = credList.find((c) => c.service === 'switcher');
      if (switcherCred?.config) {
        setSwitcherPhone(switcherCred.config.phone || '');
        setSwitcherPassword(switcherCred.config.password || '');
        setSwitcherToken(switcherCred.config.token || '');
        setSwitcherWebhook(switcherCred.config.webhookUrl || '');
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
          ? `${updated.name} ${t('הופעל', 'turned on')}`
          : `${updated.name} ${t('כובה', 'turned off')}`,
        'info'
      );
    } catch (err: any) {
      showToast(err.message || 'Error toggling device', 'error');
      loadData();
    }
  };

  // Device Settings Update
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
    setDevType('volcano_light');
    setDevRoom('סלון');
    setDevCustomRoom('');
    setDevRealId('');
    setDevTimerMins(30);
    setShowDeviceModal(true);
  };

  // Open Edit Device Modal
  const handleOpenEditDevice = (dev: SmartDevice) => {
    setEditingDevice(dev);
    setDevName(dev.name);
    setDevType(dev.device_type);
    if (ROOM_OPTIONS.includes(dev.room)) {
      setDevRoom(dev.room);
      setDevCustomRoom('');
    } else {
      setDevRoom('אחר');
      setDevCustomRoom(dev.room);
    }
    setDevRealId(dev.real_device_id || '');
    setDevTimerMins(dev.timer_minutes || 30);
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
          timer_minutes: devTimerMins,
        });
        setDevices((prev) => prev.map((d) => (d.id === editingDevice.id ? updated : d)));
        showToast(t('פרטי המכשיר עודכנו בהצלחה!', 'Device updated successfully!'), 'success');
      } else {
        const created = await apiSmartDevices.create({
          name: devName.trim(),
          device_type: devType,
          room: finalRoom,
          real_device_id: devRealId.trim() || null,
          timer_minutes: devTimerMins,
        });
        setDevices((prev) => [...prev, created]);
        showToast(t('מכשיר חדש נוסף בהצלחה!', 'New device added!'), 'success');
      }
      setShowDeviceModal(false);
    } catch (err: any) {
      showToast(err.message || 'Error saving device', 'error');
    }
  };

  // Delete Device
  const handleDeleteDevice = async (dev: SmartDevice) => {
    if (!confirm(t(`האם למחוק את המכשיר "${dev.name}"?`, `Delete device "${dev.name}"?`))) return;

    try {
      await apiSmartDevices.delete(dev.id);
      setDevices((prev) => prev.filter((d) => d.id !== dev.id));
      showToast(t('המכשיר נמחק בהצלחה', 'Device deleted'), 'info');
    } catch (err: any) {
      showToast(err.message || 'Error deleting device', 'error');
    }
  };

  // Save & Test Cloud Credentials
  const handleSaveCredentials = async (service: 'tuya' | 'switcher') => {
    setTestingCreds(true);
    setTestResult(null);

    const config =
      service === 'tuya'
        ? {
            clientId: tuyaClientId,
            clientSecret: tuyaClientSecret,
            region: tuyaRegion,
          }
        : {
            phone: switcherPhone,
            password: switcherPassword,
            token: switcherToken,
            webhookUrl: switcherWebhook,
          };

    try {
      const res = await apiSmartDevices.saveCredentials(service, config, tuyaTestDeviceId);
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
  const switcherCred = credentials.find((c) => c.service === 'switcher');

  const rooms = ['all', ...Array.from(new Set(devices.map((d) => d.room)))];
  const filteredDevices =
    roomFilter === 'all' ? devices : devices.filter((d) => d.room === roomFilter);

  const totalPower = devices.reduce((sum, d) => sum + (d.is_on ? d.power_watt || 0 : 0), 0);
  const activeCount = devices.filter((d) => d.is_on).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-3">
              <Zap size={14} className="text-amber-400" />
              <span>{t('בית חכם מקושר', 'Connected Smart Home')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t('שליטה בדוד ובתאורה', 'Boiler & Lighting Control')}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              {t(
                'שליטה ישירה בסוויצ׳ר (Switcher) לדוד מים חמים ובמנורות חכמות של וולקנו (Volcano Smart Life).',
                'Direct control of Switcher water boiler and Volcano Smart Life smart lighting.'
              )}
            </p>

            {/* Cloud Connection Badges */}
            <div className="flex items-center gap-2.5 mt-3 flex-wrap">
              <span
                onClick={() => {
                  setCredTab('switcher');
                  setShowSettingsModal(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-transform hover:scale-105 ${
                  switcherCred?.is_connected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/10 text-slate-300 border border-white/10 hover:bg-white/15'
                }`}
                title="לחץ להגדרת חיבור Switcher"
              >
                {switcherCred?.is_connected ? <Wifi size={13} className="text-emerald-400" /> : <WifiOff size={13} />}
                <span>{switcherCred?.is_connected ? 'סוויצ׳ר: מחובר לענן' : 'סוויצ׳ר: לחץ לחיבור'}</span>
              </span>

              <span
                onClick={() => {
                  setCredTab('tuya');
                  setShowSettingsModal(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-transform hover:scale-105 ${
                  tuyaCred?.is_connected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/10 text-slate-300 border border-white/10 hover:bg-white/15'
                }`}
                title="לחץ להגדרת חיבור Volcano / Smart Life"
              >
                {tuyaCred?.is_connected ? <Wifi size={13} className="text-emerald-400" /> : <WifiOff size={13} />}
                <span>{tuyaCred?.is_connected ? 'Volcano (Smart Life): מחובר' : 'Volcano: לחץ לחיבור'}</span>
              </span>
            </div>
          </div>

          {/* Action & Metric Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[95px]">
              <span className="block text-[11px] text-slate-300 font-medium">
                {t('מכשירים דולקים', 'Active Devices')}
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
              <span>{t('חיבור מכשירים אמיתיים', 'Real Connection')}</span>
            </button>
          </div>
        </div>

        {/* Master Quick Scenes Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10">
          <span className="text-xs font-bold text-slate-300 block mb-2.5">
            {t('תרחישים מהירים לכל הבית:', 'Quick Master Scenes:')}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => handleRunScene('all_off', t('כיבוי הכל', 'All Off'))}
              disabled={executingScene !== null}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-rose-500/20 border border-white/15 hover:border-rose-400/40 text-slate-200 hover:text-rose-200 font-bold text-xs transition-all active:scale-95"
            >
              <Power size={15} className="text-rose-400" />
              <span>{t('יוצאים מהבית / כיבוי הכל', 'Leaving / All Off')}</span>
            </button>

            <button
              onClick={() => handleRunScene('shower_ready', t('הכנת מקלחת', 'Shower Ready'))}
              disabled={executingScene !== null}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-amber-500/20 border border-white/15 hover:border-amber-400/40 text-slate-200 hover:text-amber-200 font-bold text-xs transition-all active:scale-95"
            >
              <ShowerHead size={15} className="text-amber-400" />
              <span>{t('מקלחת מושלמת (דוד 30 דק׳)', 'Hot Shower (30 min)')}</span>
            </button>

            <button
              onClick={() => handleRunScene('good_night', t('לילה טוב', 'Good Night'))}
              disabled={executingScene !== null}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-indigo-500/20 border border-white/15 hover:border-indigo-400/40 text-slate-200 hover:text-indigo-200 font-bold text-xs transition-all active:scale-95"
            >
              <Moon size={15} className="text-indigo-300" />
              <span>{t('לילה טוב (כיבוי דוד + עמעום)', 'Good Night')}</span>
            </button>

            <button
              onClick={() => handleRunScene('good_morning', t('בוקר טוב', 'Good Morning'))}
              disabled={executingScene !== null}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-amber-500/20 border border-white/15 hover:border-amber-400/40 text-slate-200 hover:text-amber-200 font-bold text-xs transition-all active:scale-95"
            >
              <Sun size={15} className="text-amber-300" />
              <span>{t('בוקר טוב (תאורת יום טבעית)', 'Good Morning')}</span>
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
            <span>{t('הוסף מכשיר חכם', 'Add Device')}</span>
          </button>

          <button
            onClick={loadData}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl transition-colors"
            title={t('רענן מצב מכשירים', 'Refresh')}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredDevices.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
            ⚡
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {t('אין מכשירים להצגה בחדר זה', 'No devices found in this room')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {t('לחץ על כפתור "הוסף מכשיר חכם" כדי להוסיף את הדוד, מנורת וולקנו או שקעים חכמים.', 'Click Add Device to add your boiler or smart lights.')}
          </p>
          <button
            onClick={handleOpenAddDevice}
            className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>{t('הוסף מכשיר עכשיו', 'Add Device Now')}</span>
          </button>
        </div>
      )}

      {/* Devices Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredDevices.map((device) => {
          if (device.device_type === 'switcher_boiler') {
            return (
              <SwitcherBoilerCard
                key={device.id}
                device={device}
                onToggle={() => handleToggle(device)}
                onUpdate={(patch) => handleUpdateDevice(device.id, patch)}
                onEdit={() => handleOpenEditDevice(device)}
                onDelete={() => handleDeleteDevice(device)}
              />
            );
          } else {
            return (
              <VolcanoLightCard
                key={device.id}
                device={device}
                onToggle={() => handleToggle(device)}
                onUpdate={(patch) => handleUpdateDevice(device.id, patch)}
                onEdit={() => handleOpenEditDevice(device)}
                onDelete={() => handleDeleteDevice(device)}
              />
            );
          }
        })}
      </div>

      {/* ========================================================================= */}
      {/* ➕ ADD / EDIT SMART DEVICE MODAL                                          */}
      {/* ========================================================================= */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">
                {editingDevice ? t('עריכת מכשיר חכם', 'Edit Smart Device') : t('הוספת מכשיר חכם חדש', 'Add New Smart Device')}
              </h3>
              <button
                onClick={() => setShowDeviceModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="space-y-4 pt-4">
              {/* Device Type (only when adding new) */}
              {!editingDevice && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('סוג מכשיר', 'Device Type')} *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDevType('switcher_boiler');
                        if (!devName) setDevName('דוד חשמלי (סוויצ׳ר)');
                        setDevRoom('חדר רחצה ראשי');
                      }}
                      className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition-all text-right ${
                        devType === 'switcher_boiler'
                          ? 'border-orange-500 bg-orange-50/70 text-orange-950 font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                        <Flame size={18} />
                      </div>
                      <div className="text-xs">
                        <div className="font-bold">דוד סוויצ׳ר</div>
                        <div className="text-[10px] text-slate-500">דוד מים חמים</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDevType('volcano_light');
                        if (!devName) setDevName('מנורת סלון (Volcano)');
                        setDevRoom('סלון');
                      }}
                      className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition-all text-right ${
                        devType === 'volcano_light'
                          ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                        <Lightbulb size={18} />
                      </div>
                      <div className="text-xs">
                        <div className="font-bold">Volcano / Smart Life</div>
                        <div className="text-[10px] text-slate-500">תאורה חכמה</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Device Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('שם המכשיר', 'Device Name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={devType === 'switcher_boiler' ? 'דוד חשמלי קומה 1...' : 'מנורת פינת אוכל...'}
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
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
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Real Hardware ID Link */}
              {devType === 'switcher_boiler' ? (
                <div className="p-3.5 bg-orange-50/80 rounded-2xl border border-orange-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                      <Wifi size={14} className="text-orange-600" />
                      <span>{t('זיהוי אוטומטי של סוויצ׳ר ⚡', 'Switcher Auto-Discovery')}</span>
                    </label>
                    <span className="text-[10px] bg-orange-200/80 text-orange-900 px-2 py-0.5 rounded-full font-bold">
                      ללא צורך ב-Device ID
                    </span>
                  </div>
                  <p className="text-[11px] text-orange-900 leading-relaxed">
                    באפליקציית Switcher הרגילה לא מופיע Device ID (הוא מוסתר על ידי היצרן).
                    <strong> אין צורך לחפש אותו!</strong> המערכת מזהה ומקשרת את הדוד שלכם באופן אוטומטי לחלוטין ברגע שמזינים טלפון וסיסמה בחיבור מכשירים אמיתיים.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-orange-200/70 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {devRealId ? `מזהה מקושר: ${devRealId}` : 'טרם קושר (יקושר אוטומטית בהתחברות)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeviceModal(false);
                        setCredTab('switcher');
                        setShowSettingsModal(true);
                      }}
                      className="text-xs font-bold text-orange-700 hover:text-orange-900 underline cursor-pointer"
                    >
                      הגדר חשבון סוויצ׳ר ➔
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Wifi size={14} className="text-indigo-600" />
                      <span>{t('מזהה מנורת Volcano (Device ID)', 'Real Hardware Device ID')}</span>
                    </label>
                    <span className="text-[10px] text-slate-400">אופציונלי</span>
                  </div>
                  <input
                    type="text"
                    placeholder="לדוגמה: eb5a7123984... (מתוך אפליקציית Smart Life)"
                    value={devRealId}
                    onChange={(e) => setDevRealId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    באפליקציית Smart Life: היכנסו למנורת Volcano ➔ סמל עיפרון ✏️ למעלה ➔ <strong>Device Information</strong> ➔ העתיקו את ה-<strong>Device ID</strong>.
                  </p>
                </div>
              )}

              {/* Timer Default (for Boiler) */}
              {devType === 'switcher_boiler' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('משך טיימר ברירת מחדל (דקות)', 'Default Timer Duration (minutes)')}
                  </label>
                  <select
                    value={devTimerMins}
                    onChange={(e) => setDevTimerMins(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                  >
                    <option value={15}>15 דקות</option>
                    <option value={30}>30 דקות</option>
                    <option value={45}>45 דקות</option>
                    <option value={60}>60 דקות (שעה)</option>
                    <option value={90}>90 דקות (שעה וחצי)</option>
                  </select>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors"
                >
                  {editingDevice ? t('שמור שינויים', 'Save Changes') : t('הוסף מכשיר', 'Add Device')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="py-3 px-5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
                >
                  {t('ביטול', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚙️ REAL CLOUD CREDENTIALS MODAL                                           */}
      {/* ========================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {t('הגדרות חיבור למכשירים אמיתיים', 'Real Cloud Device Settings')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('חיבור ישיר לענן של Switcher ו-Smart Life (Tuya)', 'Connect to Switcher & Tuya clouds')}
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

            {/* Service Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl my-4">
              <button
                onClick={() => {
                  setCredTab('tuya');
                  setTestResult(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  credTab === 'tuya'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lightbulb size={15} />
                <span>Volcano (Smart Life / Tuya)</span>
              </button>
              <button
                onClick={() => {
                  setCredTab('switcher');
                  setTestResult(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  credTab === 'switcher'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame size={15} />
                <span>דוד סוויצ׳ר (Switcher)</span>
              </button>
            </div>

            {/* Test Result Message Box */}
            {testResult && (
              <div
                className={`p-3.5 rounded-2xl mb-4 text-xs flex items-start gap-2.5 ${
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
                  <div className="font-bold">{testResult.success ? 'חיבור תקין!' : 'שגיאה בחיבור'}</div>
                  <div className="mt-0.5 leading-relaxed">{testResult.message}</div>
                </div>
              </div>
            )}

            {/* TUYA / SMART LIFE FORM */}
            {credTab === 'tuya' && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
                  💡 <strong>איך משיגים את המפתחות בחינם (ב-2 דקות)?</strong>
                  <ol className="list-decimal list-inside mt-1.5 space-y-1 text-[11px]">
                    <li>
                      היכנס לאתר המפתחים החינמי: 
                      <a href="https://iot.tuya.com" target="_blank" rel="noreferrer" className="underline font-bold mr-1">
                        iot.tuya.com <ExternalLink size={10} className="inline" />
                      </a>
                    </li>
                    <li>פתח Cloud Project חדש ➔ מקבלים <strong>Client ID</strong> ו-<strong>Client Secret</strong>.</li>
                    <li>בלשונית Devices ➔ Link Tuya App Account ➔ סרוק קוד QR מאפליקציית Smart Life בטלפון (בלשונית Me).</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Access ID / Client ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="לדוגמה: 3v97qj..."
                    value={tuyaClientId}
                    onChange={(e) => setTuyaClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Access Secret / Client Secret *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="לדוגמה: d7a1b4..."
                    value={tuyaClientSecret}
                    onChange={(e) => setTuyaClientSecret(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      אזור ענן (Region)
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
                      Device ID לבדיקה
                    </label>
                    <input
                      type="text"
                      placeholder="מזהה מנורת Volcano"
                      value={tuyaTestDeviceId}
                      onChange={(e) => setTuyaTestDeviceId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveCredentials('tuya')}
                  disabled={testingCreds || !tuyaClientId || !tuyaClientSecret}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
                >
                  {testingCreds ? 'בודק ומחבר מול שרתי Tuya...' : 'שמור ובדוק חיבור למנורת Volcano'}
                </button>
              </div>
            )}

            {/* SWITCHER FORM */}
            {credTab === 'switcher' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-orange-50 rounded-2xl border border-orange-200 text-orange-950 text-xs leading-relaxed space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-sm text-orange-900">
                    <span>♨️</span>
                    <span>חיבור דוד סוויצ׳ר (Switcher)</span>
                  </div>
                  <p className="text-[11px] text-orange-900 leading-relaxed">
                    סוויצ׳ר אינה דורשת Device ID! הזינו את מספר הטלפון הרשום שלכם. המערכת תסנכרן את הדוד ותאפשר שליטה מלאה, טיימרים ותרחישי כיבוי.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    מספר טלפון סוויצ׳ר *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="לדוגמה: 0501234567"
                    value={switcherPhone}
                    onChange={(e) => setSwitcherPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    סיסמת חשבון סוויצ׳ר (אופציונלי)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={switcherPassword}
                    onChange={(e) => setSwitcherPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>טוקן מפתח מ-Switcher (Token)</span>
                    </label>
                    <a
                      href="https://switcher.co.il/GetKey/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-orange-700 hover:text-orange-900 font-bold underline inline-flex items-center gap-0.5"
                    >
                      <span>קבל טוקן למייל</span>
                      <ExternalLink size={9} />
                    </a>
                  </div>
                  <input
                    type="text"
                    placeholder="לדוגמה: key_abc123... (אופציונלי)"
                    value={switcherToken}
                    onChange={(e) => setSwitcherToken(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    חברת Switcher מספקת טוקן רשמי לחיבור מערכות חיצוניות דרך switcher.co.il/GetKey.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      אפשרות מתקדמת: קישור Webhook ישיר (Home Assistant / Shortcuts)
                    </label>
                    <span className="text-[10px] text-slate-400">אופציונלי</span>
                  </div>
                  <input
                    type="text"
                    placeholder="https://maker.ifttt.com/trigger/switcher_{state}/..."
                    value={switcherWebhook}
                    onChange={(e) => setSwitcherWebhook(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-left dir-ltr bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    לשליחת פקודות HTTP ישירות ל-Home Assistant או לקיצורי דרך של Siri.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveCredentials('switcher')}
                  disabled={testingCreds || (!switcherPhone && !switcherToken && !switcherWebhook)}
                  className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  {testingCreds ? 'מתחבר ל-Switcher ומאמת...' : 'שמור והפעל חיבור לסוויצ׳ר'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------------------
 * ♨️ SWITCHER BOILER CARD (With Edit & Delete)
 * ------------------------------------------------------------------------------------- */
interface BoilerCardProps {
  device: SmartDevice;
  onToggle: () => void;
  onUpdate: (patch: Partial<SmartDevice>) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SwitcherBoilerCard: React.FC<BoilerCardProps> = ({
  device,
  onToggle,
  onUpdate,
  onEdit,
  onDelete,
}) => {
  const { t } = useHousehold();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!device.is_on || !device.timer_ends_at) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(device.timer_ends_at!).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
      } else {
        const totalSecs = Math.floor(diff / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [device.is_on, device.timer_ends_at]);

  const timerOptions = [15, 30, 45, 60];

  return (
    <div
      className={`rounded-3xl border-2 transition-all duration-300 p-6 flex flex-col justify-between ${
        device.is_on
          ? 'bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-rose-50/40 border-orange-400 shadow-lg shadow-orange-500/10'
          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
                device.is_on
                  ? 'bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md shadow-rose-500/25 animate-pulse'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Flame size={24} />
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
                    + קשר מכשיר פיזי
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-slate-800 mt-1 truncate">{device.name}</h3>
            </div>
          </div>

          {/* Action Buttons: Edit, Delete, Big Power Switch */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title={t('ערוך מכשיר', 'Edit Device')}
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title={t('מחק מכשיר', 'Delete Device')}
            >
              <Trash2 size={15} />
            </button>

            <button
              onClick={onToggle}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                device.is_on
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30 scale-105 active:scale-95'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={device.is_on ? t('כבה דוד', 'Turn Off') : t('הדלק דוד', 'Turn On')}
            >
              <Power size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Status & Water Temperature Box */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3.5 bg-white/80 rounded-2xl border border-slate-100 flex items-center gap-3">
            <Thermometer
              size={22}
              className={device.is_on ? 'text-rose-500' : 'text-slate-400'}
            />
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">
                {t('חום מים מוערך', 'Water Temp')}
              </span>
              <span className="text-sm font-black text-slate-800">
                {device.is_on ? '54.0°C 🔥' : `${device.current_temp || 46.5}°C`}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-white/80 rounded-2xl border border-slate-100 flex items-center gap-3">
            <Zap size={22} className={device.is_on ? 'text-amber-500' : 'text-slate-400'} />
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">
                {t('הספק חימום', 'Power')}
              </span>
              <span className="text-sm font-black text-slate-800">
                {device.is_on ? '2,500 W' : '0 W'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Timer Countdown Banner */}
        {device.is_on && timeLeft && (
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white flex items-center justify-between shadow-md shadow-orange-500/20">
            <div className="flex items-center gap-2">
              <Clock size={18} className="animate-spin" />
              <span className="text-xs font-bold">{t('כיבוי אוטומטי בעוד:', 'Auto shutoff in:')}</span>
            </div>
            <span className="font-mono text-lg font-black tracking-wider">{timeLeft}</span>
          </div>
        )}
      </div>

      {/* Timer Presets Buttons */}
      <div className="pt-3 border-t border-slate-100/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-600">
            {t('הגדרת טיימר הדלקה:', 'Set Timer Duration:')}
          </span>
          <span className="text-[11px] font-bold text-orange-600">
            {device.timer_minutes} {t('דקות', 'mins')}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {timerOptions.map((mins) => (
            <button
              key={mins}
              onClick={() => onUpdate({ timer_minutes: mins, is_on: 1 })}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                device.timer_minutes === mins && device.is_on
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {mins} {t('דק׳', 'm')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------------------
 * 💡 VOLCANO LIGHT CARD (With Edit & Delete)
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
                    + קשר מכשיר פיזי
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
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title={t('ערוך מכשיר', 'Edit Device')}
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title={t('מחק מכשיר', 'Delete Device')}
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
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
                className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center flex-shrink-0 ${
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
            className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
          >
            📖 {t('קריאה', 'Reading')}
          </button>
          <button
            onClick={() => applyPreset(35, 'warm', '#FFA726')}
            className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
          >
            🍿 {t('ערב נעים', 'Relax')}
          </button>
          <button
            onClick={() => applyPreset(10, 'warm', '#F43F5E')}
            className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
          >
            🌙 {t('מצב לילה', 'Night')}
          </button>
        </div>
      </div>
    </div>
  );
};
