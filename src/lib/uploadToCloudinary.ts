export async function uploadToCloudinary(file: File, folder = 'quiz'): Promise<string> {
    const signRes = await fetch(`/api/upload/sign?folder=${folder}`);
    if (!signRes.ok) throw new Error("Impossible d'obtenir la signature d'upload");
    const {
        signature, timestamp, api_key, cloud_name,
        folder: signedFolder, allowed_formats, max_bytes,
    } = await signRes.json();

    const body = new FormData();
    body.append('file', file);
    body.append('signature', signature);
    body.append('timestamp', String(timestamp));
    body.append('api_key', api_key);
    body.append('folder', signedFolder);
    if (allowed_formats) body.append('allowed_formats', allowed_formats);
    if (max_bytes) body.append('max_bytes', String(max_bytes));

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: 'POST',
        body,
    });

    if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => null);
        throw new Error(err?.error?.message ?? `Erreur Cloudinary ${uploadRes.status}`);
    }

    const data = await uploadRes.json();
    return data.secure_url as string;
}
