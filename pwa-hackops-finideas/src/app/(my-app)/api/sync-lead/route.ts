import { reverseGeocode } from "@/lib/server/reverseGeocode";
import { getPayload } from "payload";
import config from "../../../../payload.config";
import { requireAuth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (!authResult.authenticated) {
      return Response.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user: currentUser } = authResult;
    const body = await req.json();

    const { latitude, longitude, ...leadData } = body;

    let locationInfo = null;

    if (latitude && longitude) {
      try {
        locationInfo = await reverseGeocode(latitude, longitude);
      } catch (err) {
        console.warn("Geocode failed", err);
      }
    }

    const payload = await getPayload({ config });

    const data = {
      ...leadData,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      locationName: locationInfo?.displayName ?? null,
      city: locationInfo?.city ?? null,
      state: locationInfo?.state ?? null,
      country: locationInfo?.country ?? null,
    };

    await payload.create({
      collection: "leads",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...data, createdBy: currentUser.id } as any,
      overrideAccess: true,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("sync-lead error:", error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
