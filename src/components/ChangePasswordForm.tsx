import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { changePassword } from "../api/auth";
import { getErrorMessage } from "../api/client";

type ChangePasswordFormProps = {
  language?: "ru" | "en";
  telegram?: boolean;
};

const copy = {
  ru: {
    title: "Сменить пароль",
    hint: "Введите текущий пароль и задайте новый.",
    current: "Текущий пароль",
    next: "Новый пароль",
    confirm: "Повторите новый пароль",
    mismatch: "Новые пароли не совпадают.",
    unchanged: "Новый пароль должен отличаться от текущего.",
    submit: "Сменить пароль",
    pending: "Сохраняем…",
    success: "Пароль успешно изменён.",
  },
  en: {
    title: "Change password",
    hint: "Enter your current password and choose a new one.",
    current: "Current password",
    next: "New password",
    confirm: "Confirm new password",
    mismatch: "The new passwords do not match.",
    unchanged: "The new password must differ from the current password.",
    submit: "Change password",
    pending: "Saving…",
    success: "Password changed successfully.",
  },
} as const;

export function ChangePasswordForm({ language = "ru", telegram = false }: ChangePasswordFormProps) {
  const text = copy[language];
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validationError, setValidationError] = useState("");
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setValidationError("");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.reset();
    if (newPassword !== confirmation) {
      setValidationError(text.mismatch);
      return;
    }
    if (newPassword === currentPassword) {
      setValidationError(text.unchanged);
      return;
    }
    setValidationError("");
    mutation.mutate({ current_password: currentPassword, new_password: newPassword });
  }

  return (
    <section className={telegram ? "telegram-settings-card" : "password-settings-card"}>
      <div className="telegram-card-title">
        <KeyRound size={22} />
        <div><h2>{text.title}</h2><p>{text.hint}</p></div>
      </div>
      <form className={telegram ? "telegram-settings-form" : "password-settings-form"} onSubmit={handleSubmit}>
        <label>{text.current}<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} maxLength={128} required /></label>
        <label>{text.next}<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={128} required /></label>
        <label>{text.confirm}<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={128} required /></label>
        {validationError ? <p className="form-error" role="alert">{validationError}</p> : null}
        {mutation.isError ? <p className="form-error" role="alert">{getErrorMessage(mutation.error)}</p> : null}
        {mutation.isSuccess ? <p className="form-success" role="status">{text.success}</p> : null}
        <button className={telegram ? "chip" : "primary-button"} type="submit" disabled={mutation.isPending}>
          <KeyRound size={17} />{mutation.isPending ? text.pending : text.submit}
        </button>
      </form>
    </section>
  );
}
