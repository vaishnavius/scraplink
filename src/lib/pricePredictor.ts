// src/lib/pricePredictor.ts
export interface PricePrediction {
  predictedPrice: number;
  confidence: number;
  factors: {
    basePrice: number;
    weightMultiplier: number;
    marketTrend: number;
    qualityAdjustment: number;
  };
}

class PricePredictionEngine {
  private basePrices: Record<string, number> = {
    // Metal
    iron: 25,
    brass: 310,
    copper: 670,
    tin: 220,
    lead: 160,
    aluminum: 190,
    bronze: 280,
    zinc: 210,
    steel: 35,
    nickel: 430,

    // E-waste
    'circuit boards': 120,
    chips: 90,
    computer: 150,
    laptops: 170,
    //phone: 140,
    tv: 130,
    refrigerator: 110,
    'washing machine': 100,
    batteries: 80,
    charger: 60,

    // Paper
    newspaper: 18,
    magazine: 22,
    cardboard: 15,
    'printed books': 10,
    'low grade paper': 8,

    // Glass
    bottles: 5,
    'broken window': 4,
    mirror: 6,

    // Fallbacks
    'mixed metal': 50,
    'mixed ewaste': 80,
    'mixed paper': 12,
    'mixed glass': 5,
  };

  private normalize(type: string): string {
    if (!type) return '';
    return type.toLowerCase().trim().replace(/s\b/, ''); // remove plural 's'
  }

  private getFallbackType(type: string): string {
    const normalized = this.normalize(type);
    if (
      ['iron', 'brass', 'copper', 'tin', 'lead', 'aluminum', 'bronze', 'zinc', 'steel', 'nickel'].some(
        (m) => normalized.includes(m)
      )
    )
      return 'mixed metal';
    if (
      ['circuit', 'chip', 'computer', 'laptop', 'phone', 'tv', 'refrigerator', 'washing', 'batter', 'charger'].some(
        (e) => normalized.includes(e)
      )
    )
      return 'mixed ewaste';
    if (['paper', 'book', 'cardboard', 'magazine', 'newspaper'].some((p) => normalized.includes(p)))
      return 'mixed paper';
    if (['glass', 'bottle', 'mirror', 'window'].some((g) => normalized.includes(g)))
      return 'mixed glass';
    return 'mixed ewaste';
  }

  async predictPrice(type: string, weight: number, description?: string): Promise<PricePrediction> {
    const normalized = this.normalize(type);
    let basePrice = this.basePrices[normalized];

    if (!basePrice) {
      const fallback = this.getFallbackType(normalized);
      basePrice = this.basePrices[fallback];
      if (!basePrice) {
        throw new Error(`Price data not available for ${type}`);
      }
    }

    // Simple randomized factors for realism
    const weightMultiplier = 1 + Math.random() * 0.2; // 1.0–1.2
    const marketTrend = 0.9 + Math.random() * 0.2; // 0.9–1.1
    const qualityAdjustment = 0.95 + Math.random() * 0.1; // 0.95–1.05

    const predictedPrice = basePrice * weight * weightMultiplier * marketTrend * qualityAdjustment;
    const confidence = 0.85 + Math.random() * 0.1; // 85–95%

    return {
      predictedPrice,
      confidence,
      factors: {
        basePrice,
        weightMultiplier,
        marketTrend,
        qualityAdjustment,
      },
    };
  }
}

export const pricePredictor = new PricePredictionEngine();
