import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { SmartDevice, LightColorTemp } from '../../types';
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
  Sparkles,
  Sliders,
  Check,
  RefreshCw,
  Info
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

export const SmartHomeView: React.FC = () => {
  const { t, showToast } = useHousehold();
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [executingScene, setExecutingScene] = useState<string | null>(null);

  // Load devices
  const loadDevices = async () => {
    try {
      const data = await apiSmartDevices.list();
      setDevices(data);
    } catch (err: any) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    // Poll every 8 seconds for timer countdowns and live status
    const interval = setInterval(loadDevices, 8000);
    return () => clearInterval(interval);
  }, []);

  // Toggle power
  const handleToggle = async (dev: SmartDevice) => {
    try {
      // Optimistic update
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
      loadDevices();
    }
  };

  // Set device settings
  const handleUpdateDevice = async (id: string, patch: Partial<SmartDevice>) => {
    try {
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
      const updated = await apiSmartDevices.set(id, patch);
      setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (err: any) {
      showToast(err.message || 'Error updating device', 'error');
      loadDevices();
    }
  };

  // Execute master scene
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

  // Total active power
  const totalPower = devices.reduce((sum, d) => sum + (d.is_on ? d.power_watt || 0 : 0), 0);
  const activeCount = devices.filter((d) => d.is_on).length;

  const rooms = ['all', ...Array.from(new Set(devices.map((d) => d.room)))];
  const filteredDevices =
    roomFilter === 'all' ? devices : devices.filter((d) => d.room === roomFilter);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        {/* Subtle background glow */}
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
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[100px]">
              <span className="block text-[11px] text-slate-300 font-medium">
                {t('מכשירים דולקים', 'Active Devices')}
              </span>
              <span className="text-xl font-black text-amber-300">{activeCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[120px]">
              <span className="block text-[11px] text-slate-300 font-medium">
                {t('צריכה נוכחית', 'Current Power')}
              </span>
              <span className="text-xl font-black text-emerald-400">
                {totalPower.toLocaleString()} <span className="text-xs font-normal">W</span>
              </span>
            </div>
            <button
              onClick={() => setShowInfoModal(true)}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 hover:text-white transition-all self-stretch flex items-center justify-center"
              title={t('מידע על חיבור מכשירים', 'Connection Info')}
            >
              <Info size={20} />
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
              <span>{t('לילה טוב (כיבוי דוד + עמעום)', 'Good Night (Boiler Off)')}</span>
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

      {/* Room Filter Pills */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-none pb-1">
        <div className="flex items-center gap-2">
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

        <button
          onClick={loadDevices}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
          title={t('רענן מצב מכשירים', 'Refresh')}
        >
          <RefreshCw size={17} />
        </button>
      </div>

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
              />
            );
          } else {
            return (
              <VolcanoLightCard
                key={device.id}
                device={device}
                onToggle={() => handleToggle(device)}
                onUpdate={(patch) => handleUpdateDevice(device.id, patch)}
              />
            );
          }
        })}
      </div>

      {/* Connection Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-2">
              {t('חיבור מוצרי סוויצ׳ר ו-Volcano Smart Life', 'Connecting Switcher & Volcano')}
            </h3>
            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                <strong>♨️ סוויצ׳ר (Switcher):</strong> המערכת שולחת פקודות הפעלה, כיבוי וטיימרים
                אוטומטיים לסוויצ׳ר הדוד. במצב הפעלה, הדוד מתכבה אוטומטית ברגע שהטיימר מסתיים
                ומציג חישוב צריכת חשמל.
              </p>
              <p>
                <strong>💡 מנורת Volcano (Smart Life / Tuya):</strong> מוצרי וולקנו מבוססים על
                שבבי Tuya. הממשק מאפשר עמעום עוצמה מ-1% עד 100%, שינוי גוון אור (חם / טבעי / קר)
                ובחירת צבעי אווירה.
              </p>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-[11px]">
                💡 <strong>טיפ:</strong> כל שינוי שנעשה כאן נשמר במסד הנתונים ומסונכרן עם כל בני
                הבית בזמן אמת.
              </div>
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full mt-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
            >
              {t('סגור', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------------------
 * ♨️ SWITCHER BOILER CARD
 * ------------------------------------------------------------------------------------- */
interface BoilerCardProps {
  device: SmartDevice;
  onToggle: () => void;
  onUpdate: (patch: Partial<SmartDevice>) => void;
}

const SwitcherBoilerCard: React.FC<BoilerCardProps> = ({ device, onToggle, onUpdate }) => {
  const { t } = useHousehold();
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Calculate remaining timer
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
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                device.is_on
                  ? 'bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md shadow-rose-500/25 animate-pulse'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Flame size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {device.room}
              </span>
              <h3 className="text-base font-black text-slate-800 mt-1">{device.name}</h3>
            </div>
          </div>

          {/* Big Power Switch Button */}
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

        {/* Status & Water Temperature Box */}
        <div className="grid grid-cols-2 gap-3 mb-5">
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

        {/* Live Timer Countdown Banner (when On) */}
        {device.is_on && timeLeft && (
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white flex items-center justify-between shadow-md shadow-orange-500/20">
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
 * 💡 VOLCANO SMART LIFE LIGHT CARD
 * ------------------------------------------------------------------------------------- */
interface LightCardProps {
  device: SmartDevice;
  onToggle: () => void;
  onUpdate: (patch: Partial<SmartDevice>) => void;
}

const VolcanoLightCard: React.FC<LightCardProps> = ({ device, onToggle, onUpdate }) => {
  const { t } = useHousehold();

  // Atmosphere quick presets
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
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            {/* Lamp Bulb Visual Glow */}
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                device.is_on
                  ? 'text-white shadow-md'
                  : 'bg-slate-100 text-slate-400'
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
            <div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {device.room}
              </span>
              <h3 className="text-base font-black text-slate-800 mt-1">{device.name}</h3>
            </div>
          </div>

          {/* Big Power Switch Button */}
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

        {/* Dimmer Slider */}
        <div className="mb-5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
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
        <div className="mb-5">
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
