import React, { useState } from "react";
import {
  Package,
  IndianRupee,
  Zap,
  MapPin,
  Receipt,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { pricePredictor } from "../../lib/pricePredictor";
import { LoadingSpinner } from "../../components/UI/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";
import { LocationPicker } from "../../components/Maps/LocationPicker";
import { useNavigate } from "react-router-dom";

interface SubCategoryWeight {
  category: string;
  name: string;
  weight: number;
  predictedPrice?: number;
}

const SUBCATEGORIES: Record<string, string[]> = {
  metal: [
    "Iron",
    "Brass",
    "Copper",
    "Tin",
    "Lead",
    "Aluminum",
    "Bronze",
    "Zinc",
    "Steel",
    "Nickel",
  ],
  "e waste": [
    "Circuit boards",
    "Chips",
    "Computer",
    "Laptops",
    "Phone",
    "TV",
    "Refrigerator",
    "Washing machine",
    "Batteries",
    "Charger",
  ],
  paper: ["Newspaper", "Magazine", "Cardboard", "Printed books", "Low grade paper"],
  glass: ["Bottles", "Broken window", "Mirror"],
};

export function ListScrapPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<SubCategoryWeight[]>([]);
  const [description, setDescription] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [predictedTotal, setPredictedTotal] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<
    Record<string, { weight: number; price: number }>
  >({});
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [needsRecalc, setNeedsRecalc] = useState(true);

  const { profile } = useAuth();
  const navigate = useNavigate();

  // Category toggle
  const toggleCategory = (cat: string) => {
    setPredictedTotal(null);
    setNeedsRecalc(true);

    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
      setSelectedSubs(selectedSubs.filter((s) => s.category !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Subcategory toggle
  const handleSubToggle = (cat: string, sub: string) => {
    setPredictedTotal(null);
    setNeedsRecalc(true);

    const exists = selectedSubs.find((s) => s.category === cat && s.name === sub);
    if (exists) {
      setSelectedSubs(selectedSubs.filter((s) => !(s.category === cat && s.name === sub)));
    } else {
      setSelectedSubs([...selectedSubs, { category: cat, name: sub, weight: 0 }]);
    }
  };

  // Weight input
  const handleWeightChange = (cat: string, sub: string, weight: number) => {
    setPredictedTotal(null);
    setNeedsRecalc(true);
    setSelectedSubs((prev) =>
      prev.map((s) =>
        s.category === cat && s.name === sub ? { ...s, weight } : s
      )
    );
  };

  // Predict prices
  const handlePredictPrice = async () => {
    if (selectedSubs.length === 0) {
      alert("Select subcategories and enter weights.");
      return;
    }

    try {
      setPredicting(true);
      let total = 0;
      const breakdown: Record<string, { weight: number; price: number }> = {};
      const updatedSubs: SubCategoryWeight[] = [];

      for (const item of selectedSubs) {
        if (item.weight > 0) {
          const result = await pricePredictor.predictPrice(item.name, item.weight);
          total += result.predictedPrice;

          updatedSubs.push({
            ...item,
            predictedPrice: result.predictedPrice,
          });

          breakdown[item.category] = breakdown[item.category] || {
            weight: 0,
            price: 0,
          };
          breakdown[item.category].weight += item.weight;
          breakdown[item.category].price += result.predictedPrice;
        }
      }

      setSelectedSubs(updatedSubs);
      setPredictedTotal(total);
      setPriceBreakdown(breakdown);
      setNeedsRecalc(false);
    } catch (err) {
      console.error("Error predicting:", err);
      alert("Prediction failed. Try again.");
    } finally {
      setPredicting(false);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (selectedCategories.length === 0 || selectedSubs.length === 0 || !profile) {
      alert("Fill all details before submitting.");
      return;
    }
    if (!predictedTotal) {
      alert("Predict price before submitting.");
      return;
    }
    if (!location) {
      alert("Select scrap location.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("scrap_listings").insert({
        user_id: profile.user_id,
        scrap_type: selectedCategories.join(", "),
        description,
        weight: selectedSubs.reduce((a, b) => a + b.weight, 0),
        estimated_price: predictedTotal,
        latitude: location[0],
        longitude: location[1],
      });

      if (error) throw error;
      alert("Scrap listing created successfully!");
      navigate("/my-listings");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error creating listing");
    } finally {
      setLoading(false);
    }
  };

  // Summary Modal Component
  const SummaryModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative">
        <button
          onClick={() => setShowSummary(false)}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="text-center mb-6">
          <Receipt className="h-10 w-10 text-blue-600 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-gray-900">Scrap Summary</h2>
        </div>

        {selectedCategories.map((cat) => {
          const catSubs = selectedSubs.filter((s) => s.category === cat);
          const subtotal = priceBreakdown[cat]?.price || 0;
          const totalWeight = priceBreakdown[cat]?.weight || 0;

          return (
            <div key={cat} className="mb-4 border-b pb-3">
              <h3 className="font-semibold text-gray-800 mb-2 capitalize">{cat}</h3>
              <div className="text-sm text-gray-700 space-y-1">
                {catSubs.map((s) => (
                  <div
                    key={s.name}
                    className="flex justify-between border-b border-gray-100 pb-1"
                  >
                    <span>
                      {s.name} — {s.weight.toFixed(2)} kg
                    </span>
                    <span className="text-green-600 font-medium">
                      ₹{s.predictedPrice?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-gray-900 mt-2">
                  <span>Total ({totalWeight.toFixed(2)} kg)</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="text-center mt-4 pt-4 border-t">
          <p className="text-lg font-bold text-green-700">
            Grand Total: ₹{predictedTotal?.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">
              List Your Scrap
            </h1>
            <p className="text-gray-600">
              Select multiple categories, add weights & predict prices
            </p>
          </div>

          {/* CATEGORY SELECTION */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Scrap Categories
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.keys(SUBCATEGORIES).map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`border rounded-lg p-2 capitalize font-medium transition ${
                    selectedCategories.includes(cat)
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* SUBCATEGORIES */}
          {selectedCategories.map((cat) => (
            <div key={cat} className="mb-6 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg text-gray-800 mb-3 capitalize">
                {cat} Subcategories
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {SUBCATEGORIES[cat].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => handleSubToggle(cat, sub)}
                    className={`border rounded-lg p-2 text-sm transition ${
                      selectedSubs.find(
                        (s) => s.category === cat && s.name === sub
                      )
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* WEIGHT INPUTS */}
              {selectedSubs.filter((s) => s.category === cat).length > 0 && (
                <div className="space-y-3">
                  {selectedSubs
                    .filter((s) => s.category === cat)
                    .map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center gap-3 border-b pb-2"
                      >
                        <span className="w-32 text-sm font-medium text-gray-700">
                          {s.name}
                        </span>
                        <input
                          type="number"
                          value={s.weight || ""}
                          onChange={(e) =>
                            handleWeightChange(
                              s.category,
                              s.name,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="Weight (kg)"
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}

          {/* DESCRIPTION */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setNeedsRecalc(true);
                setPredictedTotal(null);
              }}
              placeholder="Describe your scrap (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* PRICE PREDICTION */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
            <h3 className="font-semibold text-gray-800 flex items-center mb-3">
              <Zap className="h-5 w-5 text-blue-600 mr-2" />
              Price Prediction
            </h3>

            {predictedTotal ? (
              <>
                <div className="text-center text-2xl font-bold text-green-600 mb-3">
                  ₹ {predictedTotal.toFixed(2)}
                </div>
                <button
                  onClick={() => setShowSummary(true)}
                  className="w-full bg-white border border-blue-500 text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition mb-3"
                >
                  <Receipt className="inline h-4 w-4 mr-1" />
                  View Summary
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-600 mb-3">
                Click below to calculate combined price.
              </p>
            )}

            <button
              onClick={handlePredictPrice}
              disabled={
                predicting || selectedSubs.length === 0 || needsRecalc === false
              }
              className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex justify-center"
            >
              {predicting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" /> Predicting...
                </>
              ) : (
                <>
                  <IndianRupee className="h-4 w-4 mr-2" />{" "}
                  {needsRecalc
                    ? "Predict Price"
                    : "Predicted (Locked until change)"}
                </>
              )}
            </button>
          </div>

          {/* LOCATION PICKER */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MapPin className="h-4 w-4 mr-1" /> Scrap Location
            </label>
            <LocationPicker
              onLocationSelect={(lat, lng) => {
                setLocation([lat, lng]);
                setNeedsRecalc(true);
              }}
              selectedLocation={location || undefined}
            />
            {location && (
              <p className="text-sm text-green-600 mt-2">
                ✓ Location: {location[0].toFixed(4)}, {location[1].toFixed(4)}
              </p>
            )}
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            disabled={loading || !predictedTotal}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex justify-center"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" /> Creating Listing...
              </>
            ) : (
              "Create Listing"
            )}
          </button>
        </div>
      </div>

      {/* Summary Modal */}
      {showSummary && <SummaryModal />}
    </div>
  );
}
