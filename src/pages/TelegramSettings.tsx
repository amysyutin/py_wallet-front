import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Languages, Link2, Save } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { getErrorMessage } from "../api/client";
import {
  getTelegramSettings,
  linkTelegramEmail,
  updateTelegramSettings,
  type TelegramSettings as TelegramSettingsData,
} from "../api/telegram";
import { getMe } from "../api/auth";
import { useAuthStore } from "../store/auth";
import { telegramCopy, useLanguage, type AppLanguage } from "../telegram/i18n";
import { requestTelegramWriteAccess } from "../telegram/runtime";

function localTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function TelegramSettings() {
  const queryClient = useQueryClient();
  const language = useLanguage((state) => state.language);
  const setLanguage = useLanguage((state) => state.setLanguage);
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const copy = telegramCopy[language];
  const [settings, setSettings] = useState<TelegramSettingsData>({
    enabled: false,
    language,
    timezone: localTimezone(),
    daily_at: "09:00",
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [writeError, setWriteError] = useState("");

  const settingsQuery = useQuery({ queryKey: ["telegram", "settings"], queryFn: getTelegramSettings });
  useEffect(() => {
    if (settingsQuery.data) setSettings(settingsQuery.data);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateTelegramSettings,
    onSuccess: (data) => {
      setSettings(data);
      setLanguage(data.language);
      queryClient.setQueryData(["telegram", "settings"], data);
    },
  });
  const linkMutation = useMutation({
    mutationFn: linkTelegramEmail,
    onSuccess: async (result) => {
      if ("access_token" in result) useAuthStore.getState().setToken(result.access_token);
      const user = await getMe();
      setUser(user);
      queryClient.setQueryData(["auth", "me"], user);
      setPassword("");
    },
  });

  async function toggleDigest() {
    setWriteError("");
    if (settings.enabled) {
      saveMutation.mutate({ ...settings, enabled: false });
      return;
    }
    const granted = await requestTelegramWriteAccess();
    if (!granted) {
      setWriteError(copy.writeDenied);
      return;
    }
    saveMutation.mutate({
      ...settings,
      enabled: true,
      timezone: localTimezone(),
      daily_at: settings.daily_at || "09:00",
      language,
    });
  }

  function savePreferences(event: FormEvent) {
    event.preventDefault();
    saveMutation.mutate(settings);
  }

  function linkAccount(event: FormEvent) {
    event.preventDefault();
    linkMutation.mutate({ email, password });
  }

  if (settingsQuery.isLoading) return <section className="telegram-settings-card"><h2>{copy.settings}</h2><p className="muted">Loading…</p></section>;

  return (
    <div className="telegram-settings-grid">
      <section className="telegram-settings-card">
        <div className="telegram-card-title"><BellRing size={22} /><div><h2>{copy.digestTitle}</h2><p>{copy.digestHint}</p></div></div>
        <div className={`digest-status ${settings.enabled ? "enabled" : ""}`}>{settings.enabled ? copy.enabled : copy.disabled}</div>
        {writeError ? <p className="form-error">{writeError}</p> : null}
        {saveMutation.isError ? <p className="form-error">{getErrorMessage(saveMutation.error)}</p> : null}
        <button className={settings.enabled ? "chip" : "primary-button"} type="button" onClick={toggleDigest} disabled={saveMutation.isPending}>
          {settings.enabled ? copy.disable : copy.enable}
        </button>
      </section>

      <section className="telegram-settings-card">
        <div className="telegram-card-title"><Languages size={22} /><h2>{copy.settings}</h2></div>
        <form className="telegram-settings-form" onSubmit={savePreferences}>
          <label>{copy.delivery}<input type="time" value={settings.daily_at} onChange={(event) => setSettings({ ...settings, daily_at: event.target.value })} /></label>
          <label>{copy.language}<select value={settings.language} onChange={(event) => setSettings({ ...settings, language: event.target.value as AppLanguage })}><option value="ru">Русский</option><option value="en">English</option></select></label>
          <small>{settings.timezone}</small>
          <button className="chip" type="submit" disabled={saveMutation.isPending}><Save size={17} />{copy.save}</button>
        </form>
      </section>

      {!user?.email ? <section className="telegram-settings-card">
        <div className="telegram-card-title"><Link2 size={22} /><div><h2>{copy.linking}</h2><p>{copy.linkingHint}</p></div></div>
        <form className="telegram-settings-form" onSubmit={linkAccount}>
          <label>{copy.email}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>{copy.password}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required /></label>
          {linkMutation.isError ? <p className="form-error">{getErrorMessage(linkMutation.error)}</p> : null}
          {linkMutation.isSuccess ? <p className="form-success">{copy.linked}</p> : null}
          <button className="chip" type="submit" disabled={linkMutation.isPending}><Link2 size={17} />{copy.link}</button>
        </form>
      </section> : null}
    </div>
  );
}
