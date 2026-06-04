export async function downloadLogs(
  from: number | null,
  to: number | null,
): Promise<{ success: true } | { success: false; message: string }> {
  const url = new URL("logs/download", window.location.href);

  if (from !== null) url.searchParams.set("from", String(from));
  if (to !== null) url.searchParams.set("to", String(to));

  const response = await fetch(url.toString());
  if (!response.ok) {
    const message = await response.text();
    return { success: false, message };
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "logs.txt";
  link.click();
  URL.revokeObjectURL(objectUrl);
  return { success: true };
}
