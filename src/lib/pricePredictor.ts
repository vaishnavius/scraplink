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

type RFResponse = {
  base_price: number;
  predicted_price: number;
  weight: number;
};

function normalizeScrapType(t: string): string {
  const s = (t || "").toLowerCase().trim().replace(/\s+/g, "-");
  if (["metal", "e-waste", "paper", "glass"].includes(s)) return s;
  // handle variants like "ewaste", "e waste"
  if (s === "ewaste") return "e-waste";
  return s;
}

class PricePredictionEngine {
  private endpoint =
    (import.meta as any).env?.VITE_RF_API_URL || "http://127.0.0.1:5000";

  /**
   * Preferred: 3-level prediction (Category → Sub-category → Leaf)
   */
  async predictPrice3(
    scrapCategory: string,
    subCategory: string,
    subSubCategory: string,
    weight: number
  ): Promise<PricePrediction> {
    if (!scrapCategory || !subCategory || !subSubCategory || !weight || weight <= 0) {
      throw new Error("Invalid inputs. Provide category, sub-category, sub-sub-category and positive weight.");
    }

    const body = {
      scrap_type: normalizeScrapType(scrapCategory),
      sub_category: subCategory,
      sub_sub_category: subSubCategory,
      weight,
    };

    const res = await fetch(`${this.endpoint}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let msg = "Prediction failed";
      try {
        const err = await res.json();
        msg = err?.error || msg;
      } catch {}
      throw new Error(msg);
    }

    const data = (await res.json()) as RFResponse;

    const basePrice = Number(data.base_price);
    const predicted = Number(
      data.predicted_price != null ? data.predicted_price : basePrice * weight
    );

    const denom = Math.max(basePrice * weight, 1e-6);
    const weightMultiplier = Math.max(predicted / denom, 0.000001);

    return {
      predictedPrice: predicted,
      confidence: 0.9, // keep UI-compatible; upgrade later if backend sends confidence
      factors: {
        basePrice,
        weightMultiplier,
        marketTrend: 1.0,
        qualityAdjustment: 1.0,
      },
    };
  }

  /**
   * Backward-compatible: 2-level (Category + Leaf)
   * - Treats subCategoryOrLeaf as the LEAF and sets sub_category="N/A" on the API.
   * - Your Flask app already supports this mode.
   */
  async predictPrice(
    scrapCategory: string,
    subCategoryOrLeaf: string,
    weight: number
  ): Promise<PricePrediction> {
    if (!scrapCategory || !subCategoryOrLeaf || !weight || weight <= 0) {
      throw new Error("Invalid inputs. Provide category, subcategory/leaf and positive weight.");
    }

    const body = {
      scrap_type: normalizeScrapType(scrapCategory),
      sub_category: subCategoryOrLeaf, // API will treat this as leaf if sub_sub_category is absent
      weight,
    };

    const res = await fetch(`${this.endpoint}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let msg = "Prediction failed";
      try {
        const err = await res.json();
        msg = err?.error || msg;
      } catch {}
      throw new Error(msg);
    }

    const data = (await res.json()) as RFResponse;

    const basePrice = Number(data.base_price);
    const predicted = Number(
      data.predicted_price != null ? data.predicted_price : basePrice * weight
    );

    const denom = Math.max(basePrice * weight, 1e-6);
    const weightMultiplier = Math.max(predicted / denom, 0.000001);

    return {
      predictedPrice: predicted,
      confidence: 0.9,
      factors: {
        basePrice,
        weightMultiplier,
        marketTrend: 1.0,
        qualityAdjustment: 1.0,
      },
    };
  }

  /**
   * Optional simple batch (sequential). If you add a /predict-batch,
   * you can optimize this to one request.
   */
  async predictBatch3(
    items: Array<{
      category: string;
      subCategory: string;
      subSubCategory: string;
      weight: number;
    }>
  ): Promise<PricePrediction[]> {
    const out: PricePrediction[] = [];
    for (const it of items) {
      out.push(
        await this.predictPrice3(it.category, it.subCategory, it.subSubCategory, it.weight)
      );
    }
    return out;
  }
}

export const pricePredictor = new PricePredictionEngine();
