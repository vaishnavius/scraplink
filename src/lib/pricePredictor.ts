import { supabase } from './supabase';

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

export interface MetalPrice {
  metal_type: string;
  current_price: number;
  last_updated: string;
  data_source: string;
}

export class PricePredictionEngine {
  private static instance: PricePredictionEngine;
  private priceCache: Map<string, MetalPrice> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): PricePredictionEngine {
    if (!PricePredictionEngine.instance) {
      PricePredictionEngine.instance = new PricePredictionEngine();
    }
    return PricePredictionEngine.instance;
  }

  async getCurrentPrices(): Promise<MetalPrice[]> {
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - this.lastCacheUpdate < this.CACHE_DURATION && this.priceCache.size > 0) {
      return Array.from(this.priceCache.values());
    }

    try {
      const { data, error } = await supabase
        .from('metal_prices')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) throw error;

      // Update cache
      this.priceCache.clear();
      data?.forEach(price => {
        this.priceCache.set(price.metal_type, price);
      });
      this.lastCacheUpdate = now;

      return data || [];
    } catch (error) {
      console.error('Error fetching current prices:', error);
      return [];
    }
  }

  async getPriceHistory(metalType: string, days: number = 30): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('metal_type', metalType)
        .gte('price_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('price_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching price history:', error);
      return [];
    }
  }

  async predictPrice(metalType: string, weight: number, description?: string): Promise<PricePrediction> {
    try {
      // Get current market price
      const prices = await this.getCurrentPrices();
      const currentPrice = prices.find(p => p.metal_type === metalType);

      if (!currentPrice) {
        throw new Error(`Price data not available for ${metalType}`);
      }

      // Get price history for trend analysis
      const history = await this.getPriceHistory(metalType, 30);
      
      // Calculate base price per kg
      const basePrice = currentPrice.current_price;

      // Calculate market trend (simplified)
      let marketTrend = 1.0;
      if (history.length >= 2) {
        const recentPrices = history.slice(-7); // Last 7 data points
        const oldPrices = history.slice(0, 7); // First 7 data points
        
        if (recentPrices.length > 0 && oldPrices.length > 0) {
          const recentAvg = recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;
          const oldAvg = oldPrices.reduce((sum, p) => sum + p.price, 0) / oldPrices.length;
          marketTrend = recentAvg / oldAvg;
        }
      }

      // Weight-based pricing (bulk discount/premium)
      let weightMultiplier = 1.0;
      if (weight > 100) {
        weightMultiplier = 0.95; // 5% bulk discount
      } else if (weight < 10) {
        weightMultiplier = 1.05; // 5% small quantity premium
      }

      // Quality adjustment based on description
      let qualityAdjustment = 1.0;
      if (description) {
        const desc = description.toLowerCase();
        if (desc.includes('high quality') || desc.includes('pure') || desc.includes('clean')) {
          qualityAdjustment = 1.1; // 10% premium for high quality
        } else if (desc.includes('mixed') || desc.includes('contaminated') || desc.includes('rusty')) {
          qualityAdjustment = 0.85; // 15% discount for lower quality
        }
      }

      // Calculate final predicted price
      const predictedPrice = basePrice * weight * marketTrend * weightMultiplier * qualityAdjustment;

      // Calculate confidence score based on data availability
      let confidence = 0.7; // Base confidence
      if (history.length > 10) confidence += 0.1;
      if (currentPrice.data_source !== 'Initial Setup') confidence += 0.1;
      if (description && description.length > 20) confidence += 0.1;

      const prediction: PricePrediction = {
        predictedPrice: Math.round(predictedPrice * 100) / 100,
        confidence: Math.min(confidence, 1.0),
        factors: {
          basePrice,
          weightMultiplier,
          marketTrend,
          qualityAdjustment,
        },
      };

      // Store prediction for accuracy tracking
      await this.storePrediction(metalType, weight, prediction);

      return prediction;
    } catch (error) {
      console.error('Error predicting price:', error);
      throw error;
    }
  }

  private async storePrediction(metalType: string, weight: number, prediction: PricePrediction): Promise<void> {
    try {
      await supabase
        .from('price_predictions')
        .insert({
          metal_type: metalType,
          weight,
          predicted_price: prediction.predictedPrice,
          confidence_score: prediction.confidence,
        });
    } catch (error) {
      console.error('Error storing prediction:', error);
    }
  }

  async updateActualPrice(predictionId: string, actualPrice: number): Promise<void> {
    try {
      const { data: prediction } = await supabase
        .from('price_predictions')
        .select('predicted_price')
        .eq('prediction_id', predictionId)
        .single();

      if (prediction) {
        const accuracy = 1 - Math.abs(prediction.predicted_price - actualPrice) / prediction.predicted_price;
        
        await supabase
          .from('price_predictions')
          .update({
            actual_price: actualPrice,
            accuracy_score: Math.max(0, accuracy),
          })
          .eq('prediction_id', predictionId);
      }
    } catch (error) {
      console.error('Error updating actual price:', error);
    }
  }
}

export const pricePredictor = PricePredictionEngine.getInstance();