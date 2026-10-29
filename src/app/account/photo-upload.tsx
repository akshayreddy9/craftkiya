"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { attachReferencePhoto } from "@/app/account/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validatePhoto } from "@/lib/photo-store";

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

/** Upload the reference photo for a "customize later" order line, straight to the private bucket. */
export function PhotoUpload({ orderItemId, userId }: { orderItemId: string; userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file?: File) => {
    if (!file) return;
    const problem = validatePhoto(file);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError("");
    try {
      const type = file.type || "image/heic";
      const path = `${userId}/later/${orderItemId}-${crypto.randomUUID()}.${extensions[type] || "jpg"}`;
      const { error: uploadError } = await createSupabaseBrowserClient().storage.from("customer-reference-images").upload(path, file, { contentType: type, upsert: false });
      if (uploadError) throw new Error("The upload failed. Please check your connection and try again.");
      const result = await attachReferencePhoto(orderItemId, path);
      if (!result.ok) throw new Error(result.error);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return <div className="photo-needed">
    <p><strong>We need your photo to begin.</strong> Upload a clear, well-lit photo and our artist will start your digital preview.</p>
    <button className="button button-clay" type="button" onClick={() => inputRef.current?.click()} disabled={busy}><Camera size={16} /> {busy ? "Uploading…" : "Upload your photo"}</button>
    <input ref={inputRef} type="file" hidden accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={(event) => upload(event.target.files?.[0])} />
    {error && <p className="form-status error" role="alert">{error}</p>}
  </div>;
}
