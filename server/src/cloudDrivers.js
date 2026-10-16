import crypto from 'crypto';

/**
 * Tuya / Smart Life Cloud API Driver
 * Official Open API for Volcano smart bulbs, switches, and plugs.
 */
class TuyaCloudDriver {
  constructor(config) {
    this.clientId = config.clientId?.trim();
    this.clientSecret = config.clientSecret?.trim();
    this.region = config.region || 'eu'; // Israel and Europe default to 'eu'
    this.baseUrl =
      this.region === 'us'
        ? 'https://openapi.tuyaus.com'
        : this.region === 'cn'
        ? 'https://openapi.tuyacn.com'
        : 'https://openapi.tuyaeu.com';
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  // Calculate HMAC-SHA256 signature according to Tuya Open API v2.0 spec
  calcSign(method, pathWithQuery, headers = {}, bodyStr = '', token = '') {
    const t = Date.now().toString();
    const nonce = '';
    const contentSha256 = crypto
      .createHash('sha256')
      .update(bodyStr || '', 'utf8')
      .digest('hex');

    const stringToSign = [method.toUpperCase(), contentSha256, '', pathWithQuery].join('\n');
    const strToHash = this.clientId + (token || '') + t + nonce + stringToSign;

    const sign = crypto
      .createHmac('sha256', this.clientSecret)
      .update(strToHash, 'utf8')
      .digest('hex')
      .toUpperCase();

    return { sign, t };
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const path = '/v1.0/token?grant_type=1';
    const { sign, t } = this.calcSign('GET', path, {}, '', '');

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        client_id: this.clientId,
        sign,
        t,
        sign_method: 'HMAC-SHA256',
      },
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.msg || `Tuya Auth Failed (Code: ${data.code})`);
    }

    this.accessToken = data.result.access_token;
    this.tokenExpiresAt = Date.now() + (data.result.expire_time - 60) * 1000;
    return this.accessToken;
  }

  async sendDeviceCommands(deviceId, commands) {
    if (!deviceId) throw new Error('Device ID is required');
    const token = await this.getAccessToken();
    const path = `/v1.0/devices/${deviceId}/commands`;
    const bodyStr = JSON.stringify({ commands });
    const { sign, t } = this.calcSign('POST', path, {}, bodyStr, token);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        client_id: this.clientId,
        access_token: token,
        sign,
        t,
        sign_method: 'HMAC-SHA256',
      },
      body: bodyStr,
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.msg || `Tuya command failed: ${data.code}`);
    }
    return data.result;
  }

  async setBulbState(deviceId, { is_on, brightness, color_temp, color_hex }) {
    const commands = [];

    if (is_on !== undefined) {
      commands.push({ code: 'switch_led', value: Boolean(is_on) });
    }

    if (is_on && brightness !== undefined) {
      // Tuya standard brightness scale is 10 - 1000
      const scaledBright = Math.max(10, Math.min(1000, Math.round(brightness * 10)));
      commands.push({ code: 'bright_value', value: scaledBright });
    }

    if (is_on && color_temp !== undefined) {
      // Tuya color temperature scale: 0 (warmest) to 1000 (coolest)
      const tempVal = color_temp === 'warm' ? 0 : color_temp === 'cool' ? 1000 : 500;
      commands.push({ code: 'temp_value', value: tempVal });
    }

    if (commands.length === 0) return true;
    return this.sendDeviceCommands(deviceId, commands);
  }

  async testConnection(testDeviceId) {
    const token = await this.getAccessToken();
    if (testDeviceId) {
      const path = `/v1.0/devices/${testDeviceId}`;
      const { sign, t } = this.calcSign('GET', path, {}, '', token);
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          client_id: this.clientId,
          access_token: token,
          sign,
          t,
          sign_method: 'HMAC-SHA256',
        },
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(`Device check failed: ${data.msg || data.code}`);
      }
      return { success: true, deviceName: data.result?.name || 'Volcano Light' };
    }
    return { success: true, message: 'Tuya Cloud Authenticated Successfully' };
  }
}

/**
 * Switcher Cloud API Driver (for Switcher electric water boiler)
 */
class SwitcherCloudDriver {
  constructor(config) {
    this.phone = config.phone?.trim();
    this.password = config.password?.trim();
    this.token = config.token?.trim();
    this.webhookUrl = config.webhookUrl?.trim();
    this.baseUrl = 'https://api.switcher.co.il/v1';
  }

  async login() {
    if (this.token) return this.token;
    if (!this.phone || !this.password) {
      throw new Error('יש להזין מספר טלפון וסיסמה של סוויצ׳ר');
    }

    const cleanPhone = this.phone.replace(/[\s-]/g, '');

    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        password: this.password,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
      // Also try with international prefix 972 without leading 0
      if (cleanPhone.startsWith('0')) {
        const intlPhone = '972' + cleanPhone.slice(1);
        const retryRes = await fetch(`${this.baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: intlPhone,
            password: this.password,
          }),
        });
        const retryData = await retryRes.json().catch(() => ({}));
        if (retryRes.ok && retryData.token) {
          this.token = retryData.token;
          return this.token;
        }
      }

      throw new Error(data.message || data.error || 'ההתחברות לענן סוויצ׳ר נכשלה. ודא שמספר הטלפון והסיסמה נכונים (או הגדר סיסמה באפליקציית סוויצ׳ר)');
    }

    this.token = data.token;
    return this.token;
  }

  async controlBoiler(deviceId, { is_on, timer_minutes = 30 }) {
    // If user provided a webhook URL (e.g. Home Assistant or IFTTT bridge for Switcher)
    if (this.webhookUrl) {
      const url = this.webhookUrl.replace('{state}', is_on ? 'on' : 'off').replace('{timer}', timer_minutes);
      await fetch(url, { method: 'POST' });
      return true;
    }

    // If deviceId wasn't provided, attempt auto-discovery from account
    if (!deviceId) {
      try {
        const devices = await this.getDevices();
        if (devices && devices.length > 0) {
          deviceId = devices[0].id || devices[0].device_id;
        }
      } catch (e) {}
    }

    if (!deviceId) throw new Error('לא זוהה מזהה דוד של Switcher. יש להתחבר עם טלפון וסיסמה בחיבור מכשירים');

    // Attempt direct Switcher Cloud command
    const token = await this.login();
    const endpoint = `${this.baseUrl}/devices/${deviceId}/control`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        state: is_on ? 1 : 0,
        timer: is_on ? timer_minutes : 0,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'פקודת הדלקת/כיבוי הדוד בענן Switcher נכשלה');
    }
    return data;
  }

  async getDevices() {
    const token = await this.login();
    const res = await fetch(`${this.baseUrl}/devices`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ([]));
    if (!res.ok) {
      // Fallback try alternate user devices endpoint
      const altRes = await fetch(`${this.baseUrl}/user/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const altData = await altRes.json().catch(() => ([]));
      return Array.isArray(altData) ? altData : altData.devices || [];
    }
    return Array.isArray(data) ? data : data.devices || [];
  }

  async testConnection() {
    if (this.webhookUrl) {
      return { success: true, message: 'Webhook URL configured' };
    }
    const token = await this.login();
    let discoveredMessage = 'מחובר בהצלחה לענן Switcher!';
    let devices = [];

    try {
      devices = await this.getDevices();
      if (devices && devices.length > 0) {
        const first = devices[0];
        discoveredMessage = `מחובר בהצלחה! זוהה מכשיר סוויצ׳ר: "${first.name || 'דוד'}" (מזהה: ${first.id || first.device_id || 'OK'})`;
      }
    } catch (e) {
      // Token verified successfully
    }

    return { success: true, message: discoveredMessage, devices };
  }
}

export function createTuyaDriver(config) {
  return new TuyaCloudDriver(config);
}

export function createSwitcherDriver(config) {
  return new SwitcherCloudDriver(config);
}
