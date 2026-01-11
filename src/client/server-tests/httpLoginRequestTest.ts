export default async function httpLoginRequestTest(
  username?: string,
  password?: string
) {
  console.log("Starting login test...");

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Sends an empty object if no args passed in
      body: JSON.stringify({
        username: username || undefined,
        password: password || undefined,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Success:", data);
    } else {
      console.warn(`Failed (${response.status}):`, data.message);
    }
  } catch (error) {
    console.error("Network Error:", error);
  }
}
