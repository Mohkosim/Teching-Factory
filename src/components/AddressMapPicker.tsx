"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Locate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export interface ReverseGeocodeResult {
    alamat_lengkap: string;
    kota: string;
    kecamatan: string;
    provinsi: string;
    kode_pos: string;
    latitude: number;
    longitude: number;
}

interface AddressMapPickerProps {
    onLocationSelect: (result: ReverseGeocodeResult) => void;
    defaultCenter?: [number, number];
    /** Posisi yang sudah tersimpan sebelumnya (mis. dari database). Kalau ada, peta akan langsung menampilkan marker di titik ini tanpa perlu mencari ulang. */
    initialPosition?: [number, number] | null;
}

const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456];

async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { "Accept-Language": "id" } }
    );

    if (!res.ok) {
        throw new Error("Gagal mengambil data alamat dari lokasi");
    }

    const data = await res.json();
    const addr = data.address ?? {};

    const kota =
        addr.city ?? addr.town ?? addr.regency ?? addr.county ?? addr.municipality ?? "";
    const kecamatan =
        addr.suburb ?? addr.city_district ?? addr.village ?? addr.subdistrict ?? "";
    const provinsi = addr.state ?? "";
    const kode_pos = addr.postcode ?? "";
    const alamat_lengkap: string = data.display_name ?? "";

    return { alamat_lengkap, kota, kecamatan, provinsi, kode_pos, latitude: lat, longitude: lng };
}

function LocationMarker({
    position,
    onPick,
}: {
    position: [number, number] | null;
    onPick: (lat: number, lng: number) => void;
}) {
    const isProcessing = useRef(false);

    useMapEvents({
        click(e) {
            if (isProcessing.current) return;
            isProcessing.current = true;
            onPick(e.latlng.lat, e.latlng.lng);
            setTimeout(() => { isProcessing.current = false; }, 1000);
        },
    });

    return position ? <Marker position={position} icon={markerIcon} /> : null;
}

function FlyToLocation({ position, shouldFly }: { position: [number, number] | null; shouldFly: boolean }) {
    const map = useMap();
    useEffect(() => {
        if (position && shouldFly) {
            map.flyTo(position, 16);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [position, shouldFly]);
    return null;
}

export default function AddressMapPicker({
    onLocationSelect,
    defaultCenter = DEFAULT_CENTER,
    initialPosition = null,
}: AddressMapPickerProps) {
    const [position, setPosition] = useState<[number, number] | null>(initialPosition);
    const [loadingGeocode, setLoadingGeocode] = useState(false);
    const [loadingGps, setLoadingGps] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasSyncedInitial = useRef(false);

    // Sinkronkan posisi awal HANYA sekali saat data dari server datang belakangan
    // (misalnya initialData masih loading saat komponen pertama mount).
    // Tidak menimpa titik yang sudah dipilih user secara manual.
    useEffect(() => {
        if (!hasSyncedInitial.current && initialPosition && !position) {
            setPosition(initialPosition);
            hasSyncedInitial.current = true;
        }
    }, [initialPosition, position]);

    const handlePick = useCallback(
        async (lat: number, lng: number) => {
            setPosition([lat, lng]);
            setError(null);
            setLoadingGeocode(true);
            try {
                const result = await reverseGeocode(lat, lng);
                onLocationSelect(result);
            } catch {
                setError("Gagal mendapatkan detail alamat, coba titik lain di peta");
            } finally {
                setLoadingGeocode(false);
            }
        },
        [onLocationSelect]
    );

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            setError("Perangkat tidak mendukung deteksi lokasi");
            return;
        }
        setLoadingGps(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLoadingGps(false);
                handlePick(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
                setLoadingGps(false);
                setError("Tidak bisa mengakses lokasi. Pastikan izin lokasi diaktifkan");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                    Pilih lokasi di peta untuk mengisi alamat otomatis
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseMyLocation}
                    disabled={loadingGps}
                    className="rounded-lg text-xs flex items-center gap-1.5"
                >
                    {loadingGps ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Locate className="w-3.5 h-3.5" />
                    )}
                    Gunakan Lokasi Saya
                </Button>
            </div>

            <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gray-200">
                <MapContainer
                    center={position ?? defaultCenter}
                    zoom={position ? 16 : 12}
                    scrollWheelZoom
                    style={{ width: "100%", height: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} onPick={handlePick} />
                    <FlyToLocation position={position} shouldFly={loadingGps} />
                </MapContainer>

                {loadingGeocode && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                    </div>
                )}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            {!error && (
                <p className="text-xs text-gray-400">
                    Klik titik pada peta untuk menandai lokasi pengiriman, form di bawah akan terisi otomatis.
                </p>
            )}
        </div>
    );
}