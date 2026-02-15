export async function reverseGeocode(
  lat: number,
  lng: number
) {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lng}&format=json`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "pwa-lead-app",
    },
  });

  if (!res.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const data = await res.json();

  return {
    displayName: data.display_name,
    city: data.address?.city || data.address?.town,
    state: data.address?.state,
    country: data.address?.country,
    postcode: data.address?.postcode,
  };
}
