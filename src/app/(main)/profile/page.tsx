"use client";

import { useEffect, useState } from "react";
import type { ProfileData, ChangePasswordInput } from "@/types/profile";

export default function ProfilePage() {
  // Profile form state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Password form state
  const [passwordForm, setPasswordForm] = useState<ChangePasswordInput>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Form field state (separate from loaded profile to track edits)
  const [name, setName] = useState("");
  const [alter, setAlter] = useState("");
  const [geschlecht, setGeschlecht] = useState("");
  const [erfahrungslevel, setErfahrungslevel] = useState("");
  const [stimmlage, setStimmlage] = useState("");
  const [genre, setGenre] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          throw new Error("Fehler beim Laden des Profils");
        }
        const json = await res.json();
        const p: ProfileData = json.profile;
        setProfile(p);
        setName(p.name ?? "");
        setAlter(p.alter != null ? String(p.alter) : "");
        setGeschlecht(p.geschlecht ?? "");
        setErfahrungslevel(p.erfahrungslevel ?? "");
        setStimmlage(p.stimmlage ?? "");
        setGenre(p.genre ?? "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  function parseFieldError(errorMsg: string): Record<string, string> {
    const errors: Record<string, string> = {};
    if (errorMsg.includes("Name darf nicht leer sein") || errorMsg.includes("Name darf maximal 100 Zeichen")) {
      errors.name = errorMsg;
    }
    if (errorMsg.includes("Alter")) {
      errors.alter = errorMsg;
    }
    if (errorMsg.includes("Geschlecht")) {
      errors.geschlecht = errorMsg;
    }
    if (errorMsg.includes("Erfahrungslevel")) {
      errors.erfahrungslevel = errorMsg;
    }
    return errors;
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const body: Record<string, unknown> = {
      name: name.trim(),
      alter: alter.trim() === "" ? null : Number(alter),
      geschlecht: geschlecht || null,
      erfahrungslevel: erfahrungslevel || null,
      stimmlage: stimmlage.trim() || null,
      genre: genre.trim() || null,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const errMsg = json.error ?? "Fehler beim Speichern";
        setFieldErrors(parseFieldError(errMsg));
        setError(errMsg);
        return;
      }
      setProfile(json.profile);
      setSuccess("Profil erfolgreich gespeichert.");
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setPasswordError(json.error ?? "Fehler beim Ändern des Passworts");
        return;
      }
      setPasswordSuccess("Passwort erfolgreich geändert.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setPasswordError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500">Profil wird geladen…</div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Mein Profil</h1>

      {/* Profile data form */}
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-5 sm:px-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profildaten</h2>

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}
        {error && profile && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          {/* Alter */}
          <div>
            <label htmlFor="alter" className="block text-sm font-medium text-gray-700 mb-1">
              Alter
            </label>
            <input
              id="alter"
              type="number"
              value={alter}
              onChange={(e) => setAlter(e.target.value)}
              min={1}
              max={120}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {fieldErrors.alter && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.alter}</p>
            )}
          </div>

          {/* Geschlecht */}
          <div>
            <label htmlFor="geschlecht" className="block text-sm font-medium text-gray-700 mb-1">
              Geschlecht
            </label>
            <select
              id="geschlecht"
              value={geschlecht}
              onChange={(e) => setGeschlecht(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Bitte wählen —</option>
              <option value="MAENNLICH">Männlich</option>
              <option value="WEIBLICH">Weiblich</option>
              <option value="DIVERS">Divers</option>
            </select>
            {fieldErrors.geschlecht && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.geschlecht}</p>
            )}
          </div>

          {/* Erfahrungslevel */}
          <div>
            <label htmlFor="erfahrungslevel" className="block text-sm font-medium text-gray-700 mb-1">
              Erfahrungslevel
            </label>
            <select
              id="erfahrungslevel"
              value={erfahrungslevel}
              onChange={(e) => setErfahrungslevel(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Bitte wählen —</option>
              <option value="ANFAENGER">Anfänger</option>
              <option value="FORTGESCHRITTEN">Fortgeschritten</option>
              <option value="ERFAHREN">Erfahren</option>
              <option value="PROFI">Profi</option>
            </select>
            {fieldErrors.erfahrungslevel && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.erfahrungslevel}</p>
            )}
          </div>

          {/* Stimmlage */}
          <div>
            <label htmlFor="stimmlage" className="block text-sm font-medium text-gray-700 mb-1">
              Stimmlage
            </label>
            <input
              id="stimmlage"
              type="text"
              value={stimmlage}
              onChange={(e) => setStimmlage(e.target.value)}
              placeholder="z.B. Tenor, Sopran, Alt…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Genre */}
          <div>
            <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1">
              Genre
            </label>
            <input
              id="genre"
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="z.B. Pop, Rock, Jazz…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {saving ? "Speichert…" : "Profil speichern"}
            </button>
          </div>
        </form>
      </div>

      {/* Password change section */}
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-5 sm:px-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Passwort ändern</h2>

        {passwordSuccess && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {passwordSuccess}
          </div>
        )}
        {passwordError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Aktuelles Passwort
            </label>
            <input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Neues Passwort
            </label>
            <input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Neues Passwort bestätigen
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {passwordSaving ? "Speichert…" : "Passwort ändern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
