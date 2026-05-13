export interface AddressSuggestion {
  display: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

interface NominatimResponse {
  place_id: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    state?: string;
    postcode?: string;
  };
}

const PROVINCE_CODES: Record<string, string> = {
  "alberta": "AB",
  "british columbia": "BC",
  "manitoba": "MB",
  "new brunswick": "NB",
  "newfoundland and labrador": "NL",
  "nova scotia": "NS",
  "ontario": "ON",
  "prince edward island": "PE",
  "quebec": "QC",
  "saskatchewan": "SK",
  "northwest territories": "NT",
  "nunavut": "NU",
  "yukon": "YT",
};

function toProvinceCode(provinceName: string): string {
  const normalized = provinceName.toLowerCase();
  return PROVINCE_CODES[normalized] || provinceName.toUpperCase().slice(0, 2);
}

function parseNominatimResponse(result: NominatimResponse): AddressSuggestion {
  const { address, display_name } = result;
  
  const street = [address.house_number, address.road].filter(Boolean).join(" ") || "";
  const city = address.city || address.town || "";
  const province = address.state ? toProvinceCode(address.state) : "";
  const postalCode = address.postcode || "";
  
  return {
    display: display_name,
    street,
    city,
    province,
    postalCode,
  };
}

export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  if (!query || query.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    format: "json",
    addressdetails: "1",
    countrycode: "ca",
    limit: "5",
    q: query,
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "Titan-Dashboard-Address-Autocomplete",
        },
      }
    );

    if (!response.ok) {
      console.error("Nominatim API error:", response.status);
      return [];
    }

    const data: NominatimResponse[] = await response.json();
    return data.map(parseNominatimResponse);
  } catch (error) {
    console.error("Failed to fetch addresses:", error);
    return [];
  }
}

export function formatAddressShort(address: string): string {
  if (!address) return "";
  
  const parts = address.split(",").map(p => p.trim());
  
  // Try to extract: street, city, province, postal code
  // Typical Canadian format: "street, neighborhood, city, province, postal code, country"
  // We want: "street, city, province postal code"
  
  if (parts.length === 0) return address;
  
  const street = parts[0];
  
  // Find city (usually after neighborhoods, before province)
  // Province is typically 2-letter code or full province name
  const provinceIndex = parts.findIndex(p => 
    /^[A-Z]{2}$/.test(p) || 
    /^(Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland|Nova Scotia|Ontario|Prince Edward Island|Quebec|Saskatchewan|Northwest Territories|Nunavut|Yukon)$/i.test(p)
  );
  
  if (provinceIndex === -1) {
    // Can't parse, return first 2 parts
    return parts.slice(0, 2).join(", ");
  }
  
  const province = parts[provinceIndex];
  const city = provinceIndex > 1 ? parts[provinceIndex - 1] : parts[1];
  const postalCode = provinceIndex < parts.length - 1 ? parts[provinceIndex + 1] : "";
  
  const result = [street, city, province];
  if (postalCode) result.push(postalCode);
  
  return result.join(", ");
}

export function getGoogleMapsSearchUrl(address: string): string {
  const params = new URLSearchParams({
    api: "1",
    query: address.trim(),
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}
