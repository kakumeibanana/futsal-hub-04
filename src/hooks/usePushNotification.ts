import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotification() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window;

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [supported]);

  async function subscribe() {
    if (!supported) {
      alert(
        'このブラウザはプッシュ通知に対応していません。\n' +
        'Android: Chrome で開いてください。\n' +
        'iPhone: Safari でホーム画面に追加（iOS 16.4以降）してから開いてください。'
      );
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      alert('VAPID公開鍵が設定されていません。管理者に連絡してください。');
      return;
    }
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      await supabase.from('push_subscriptions').upsert(
        {
          endpoint: json.endpoint,
          p256dh: (json.keys as Record<string, string>).p256dh,
          auth: (json.keys as Record<string, string>).auth,
          member_role: localStorage.getItem('futsal_member_role') ?? 'member',
        },
        { onConflict: 'endpoint' }
      );
      setIsSubscribed(true);
    } catch (err) {
      console.error('Push subscription failed:', err);
      alert('通知の登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribe() {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe failed:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return { isSubscribed, isLoading, supported, subscribe, unsubscribe };
}
