import React, { useState } from "react";
import { Package, IndianRupee, Zap, MapPin, Receipt, X, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { pricePredictor } from "../../lib/pricePredictor";
import { LoadingSpinner } from "../../components/UI/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";
import { LocationPicker } from "../../components/Maps/LocationPicker";
import { useNavigate } from "react-router-dom";

/** ============= 3-LEVEL HIERARCHY (Category -> Sub-category -> Leaf) ============= */
type Hierarchy = Record<string, Record<string, string[]>>;

const HIERARCHY: Hierarchy = {
  metal: {
    "Ferrous Metals": [
      "Heavy Melting Steel (HMS 1 & HMS 2)",
      "Cast Iron Scrap",
      "Mild Steel Turning & Boring",
      "Re-rolling Scrap",
      "Shredded Steel Scrap (210/211)",
      // simple names still allowed
      "Steel", "Iron",
    ],
    "Non-Ferrous Metals": [
      "Copper Scrap (Birch/Cliff)",
      "Copper Scrap (Berry)",
      "Copper Scrap (Candy)",
      "Aluminum UBC (Used Beverage Cans)",
      "Aluminum Extrusion Scrap",
      "Brass Scrap (Honey)",
      "Brass Scrap (Yellow Brass)",
      "Lead Scrap (Soft Lead)",
      "Lead Scrap (Battery Lead)",
      "Zinc Scrap (Zinc Die Cast)",
      "Bronze", "Nickel", "Aluminum", "Brass", "Copper", "Tin", "Lead", "Zinc",
    ],
  },

  "e waste": {
    "Computing Devices": [
      // Laptop
      "Laptop - Basic Laptop","Laptop - Gaming Laptop","Laptop - Ultrabook","Laptop - MacBook","Laptop - Chromebook",
      "Laptop Motherboard","Laptop RAM","Laptop Battery","Laptop Display Panel","Laptop Charger",
      // Desktop
      "Desktop - Office Desktop","Desktop - Gaming Desktop","Desktop - All-in-One PC","CPU Cabinet",
      "Motherboard (Low Grade)","Motherboard (High Grade)","RAM DDR3","RAM DDR4","Hard Disk Drive","Solid State Drive",
      "Graphic Card (GPU)","SMPS Unit","Cooling Fan","Heatsink",
      // Monitor / Input
      "Monitor - LED Monitor","Monitor - LCD Monitor","Monitor - CRT Monitor",
      "Keyboard - Mechanical Keyboard","Keyboard - Membrane Keyboard","Keyboard - Wireless Keyboard",
      "Mouse (Optical)","Mouse (Wired)","Mouse (Wireless)",
      // Printer / Scanner / UPS
      "Printer - Inkjet Printer","Printer - Laser Printer","Printer - Dot Matrix Printer","Printer PCB","Scanner",
      "UPS - Small UPS","UPS - Office UPS","UPS with Battery","SMPS Board",
    ],
    "Mobile Devices": [
      "Phone - Feature Phone","Phone - Smartphone (Basic)","Phone - Smartphone (Mid-Range)","Phone - Smartphone (Flagship)","Broken Phones",
      "Mobile PCB (Low Grade)","Mobile PCB (High Grade)",
      "Tablet - Basic Android Tablet","Tablet - Premium Tablet","iPad",
      "Tablet Motherboard","Tablet Battery","Tablet Screen",
      "Mobile Charger","Tablet Charger","Fast Charger","Wireless Charger","USB Cable",
      "Earphones - Wired","Earphones - Wireless","Bluetooth Headphones","Smartwatch",
    ],
    "Home Appliances": [
      "Refrigerator - Single Door","Refrigerator - Double Door","Refrigerator - Commercial","Refrigerator - Compressor Unit",
      "Air Conditioner - Window AC","Air Conditioner - Split AC Indoor Unit","Air Conditioner - Split AC Outdoor Unit","AC - Compressor","AC - Copper Coil",
      "Washing Machine - Semi-Automatic","Washing Machine - Fully Automatic","Washing Machine - Industrial","Washing Machine - Motor Unit",
      "Microwave Oven - Small","Microwave Oven - Convection","Microwave Oven - Industrial",
      "Water Purifier - Electric RO","Water Purifier - UV","Water Purifier - Industrial",
    ],
    "Small Electronics": [
      "Mixer - Mixer Grinder","Mixer - Juicer Mixer","Blender Motor","Copper Coil",
      "Iron - Dry Iron","Iron - Steam Iron","Iron - Industrial Iron",
      "Fan - Ceiling Fan","Fan - Table Fan","Fan - Exhaust Fan","Cooler Motor",
      "Heater - Room Heater","Heater - Water Heater (Geyser)","Heater - Immersion Rod","Heating Coil",
      "TV - LED TV","TV - LCD TV","TV - CRT TV","Smart TV","TV PCB Board","Remote Control",
      "Set-Top Box - DTH Box","Set-Top Box - Cable Receiver","Set-Top Box - Smart Box","Set-Top Box - Circuit Board",
    ],
    "Lighting Equipment": [
      "LED Bulb - 5W","LED Bulb - 9W","Smart Bulb","Industrial Bulb",
      "Tube Light - LED Tube","Tube Light - Fluorescent Tube","Tube Light - Industrial Tube Light",
      "Street Light - LED Street Light","Street Light - Solar Street Light","Street Light - High Mast Light",
      "Lamp - Desk Lamp","Lamp - Emergency Light","Lamp - Decorative Lamp",
    ],
    "Batteries": [
      "Mobile Battery - Li-ion 2500mAh","Mobile Battery - Li-ion 4000mAh","Mobile Battery - Damaged",
      "Laptop Battery - 3-Cell","Laptop Battery - 6-Cell","Laptop Battery - 9-Cell","Laptop Battery - Damaged Pack",
      "UPS Battery - Lead-Acid Small","UPS Battery - Lead-Acid Large","UPS Battery - Dry Battery","UPS Battery - Tubular Battery",
      "Power Bank - 5000mAh","Power Bank - 10000mAh","Power Bank - 20000mAh",
      "E-Vehicle Battery - E-Bike","E-Vehicle Battery - E-Scooter","E-Vehicle Battery - Lithium Pack",
    ],
    "Circuit Components": [
      "PCB - Low-Grade","PCB - Medium-Grade","PCB - High-Grade","Motherboard PCB","Mobile PCB","Server PCB","TV PCB","Mixed PCB",
      "Copper Coil - Small","Copper Coil - Transformer Coil","Copper Coil - Motor Coil","AC Compressor Coil",
      "RAM / IC Chips - DDR3","RAM / IC Chips - DDR4","RAM / IC Chips - DDR5","IC Processor Chips","CPU Socket Chips",
      "Power Boards - SMPS Board","Power Boards - Inverter Board","Power Boards - Charger Board","Power Boards - PSU Board",
      "Graphic Cards - Entry-Level GPU","Graphic Cards - Mid-Range GPU","Graphic Cards - High-End RTX GPU",
      "Server Boards - Xeon Boards","Server Boards - Data Center Boards","Server Boards - Rack Server Board",
    ],
    "Industrial Equipment": [
      "Server - Tower Server","Server - Rack Server","Server - Blade Server","Server - Server Board","Server - Power Unit",
      "Projector - LED","Projector - DLP","Projector - LCD","Projector - Industrial",
      "Photocopier - Office Copier","Photocopier - Heavy-Duty Copier","Photocopier - Printer-Copier Combo",
      "Control Panel - Industrial","Control Panel - Power Distribution Panel","Control Panel - Machine Panel Board",
      "Network Equipment - Router","Network Equipment - Switch","Network Equipment - Hub","Network Equipment - Rack Mount Unit","Network Equipment - Modem",
      "Lab Equipment - Diagnostic Device","Lab Equipment - Analyzer","Lab Equipment - X-Ray Monitor (Non-hazardous)",
    ],
  },

  paper: {
    "Mixed & Office Paper": [
      "Mixed Waste Paper","Office Paper Grade-1","Old Newspaper (ONP)",
      // keep simple too
      "Newspaper","Magazine",
    ],
    "Cardboard & Packaging": [
      "OCC (Old Corrugated Cartons)","Kraft Paper Scrap","Duplex Board Cuttings","Cardboard",
    ],
    "High-Grade Paper": [
      "White Ledger Paper","Sorted Office Paper (SOP)","Printed books","Low grade paper",
    ],
  },

  glass: {
    "Container Glass": ["Bottles (Beer)","Bottles (Wine)","Bottles (Soft Drink)","Jars","Bottles"],
    "Sheet Glass": ["Window Glass","Tempered Glass","Tinted Glass","Broken window"],
    "Automotive Glass": ["Windshield","Side Windows","Rear Glass"],
    "Broken & Mixed Glass": ["Crushed Glass","Decorative Glass Pieces","Mirror Scrap","Mirror"],
  },
};

/** ============= Selection types ============= */
interface LeafSelection {
  category: string;       // metal | e waste | paper | glass
  subcategory: string;    // group (e.g., "Ferrous Metals", "Computing Devices")
  leaf: string;           // final item
  weight: number;         // kg
  predictedPrice?: number;
}

export function ListScrapPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [openSubcats, setOpenSubcats] = useState<Record<string, boolean>>({}); // controls expand/collapse of sub-categories per category
  const [selectedLeaves, setSelectedLeaves] = useState<LeafSelection[]>([]);
  const [description, setDescription] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [predictedTotal, setPredictedTotal] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<Record<string, { weight: number; price: number }>>({});
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [needsRecalc, setNeedsRecalc] = useState(true);

  const { profile } = useAuth();
  const navigate = useNavigate();

  /** ---------- Category toggle ---------- */
  const toggleCategory = (cat: string) => {
    setPredictedTotal(null);
    setNeedsRecalc(true);

    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
      setSelectedLeaves(selectedLeaves.filter((s) => s.category !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  /** ---------- Sub-category accordion toggle ---------- */
  const toggleSubcatOpen = (cat: string, sub: string) => {
    const key = `${cat}::${sub}`;
    setOpenSubcats((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /** ---------- Leaf toggle ---------- */
  const toggleLeaf = (category: string, subcategory: string, leaf: string) => {
    setPredictedTotal(null);
    setNeedsRecalc(true);

    const exists = selectedLeaves.find(
      (s) => s.category === category && s.subcategory === subcategory && s.leaf === leaf
    );
    if (exists) {
      setSelectedLeaves(selectedLeaves.filter(
        (s) => !(s.category === category && s.subcategory === subcategory && s.leaf === leaf)
      ));
    } else {
      setSelectedLeaves([...selectedLeaves, { category, subcategory, leaf, weight: 0 }]);
    }
  };

  /** ---------- Weight change ---------- */
  const handleWeightChange = (category: string, subcategory: string, leaf: string, weight: number) => {
    setPredictedTotal(null);
    setNeedsRecalc(true);
    setSelectedLeaves((prev) =>
      prev.map((s) =>
        s.category === category && s.subcategory === subcategory && s.leaf === leaf
          ? { ...s, weight }
          : s
      )
    );
  };

  /** ---------- Predict via RF backend ---------- */
  const handlePredictPrice = async () => {
    if (selectedLeaves.length === 0) {
      alert("Pick at least one sub-subcategory and enter weights.");
      return;
    }

    try {
      setPredicting(true);
      let total = 0;
      const breakdown: Record<string, { weight: number; price: number }> = {};
      const updated: LeafSelection[] = [];

      for (const item of selectedLeaves) {
        if (item.weight > 0) {
          const res = await pricePredictor.predictPrice(item.category, item.leaf, item.weight);
          total += res.predictedPrice;
          updated.push({ ...item, predictedPrice: res.predictedPrice });

          // breakdown at Category level
          breakdown[item.category] = breakdown[item.category] || { weight: 0, price: 0 };
          breakdown[item.category].weight += item.weight;
          breakdown[item.category].price += res.predictedPrice;
        } else {
          updated.push(item);
        }
      }

      setSelectedLeaves(updated);
      setPredictedTotal(total);
      setPriceBreakdown(breakdown);
      setNeedsRecalc(false);
    } catch (e) {
      console.error(e);
      alert("Prediction failed. Ensure your RF backend is running and recognizes these labels.");
    } finally {
      setPredicting(false);
    }
  };

  /** ---------- Submit ---------- */
  const handleSubmit = async () => {
    if (selectedCategories.length === 0 || selectedLeaves.length === 0 || !profile) {
      alert("Please complete category and item selection.");
      return;
    }
    if (!predictedTotal) {
      alert("Please predict price before submitting.");
      return;
    }
    if (!location) {
      alert("Please select a location.");
      return;
    }

    const totalWeight = selectedLeaves.reduce((acc, s) => acc + (s.weight || 0), 0);

    setLoading(true);
    try {
      const { error } = await supabase.from("scrap_listings").insert({
        user_id: profile.user_id,
        scrap_type: selectedCategories.join(", "),   // keeping schema compatible
        description,
        weight: totalWeight,
        estimated_price: predictedTotal,
        latitude: location[0],
        longitude: location[1],
      });

      if (error) throw error;
      alert("Scrap listing created successfully!");
      navigate("/my-listings");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error creating listing.");
    } finally {
      setLoading(false);
    }
  };

  /** ---------- Summary Modal ---------- */
  const SummaryModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative">
        <button onClick={() => setShowSummary(false)} className="absolute top-3 right-3 text-gray-600 hover:text-gray-900">
          <X className="h-6 w-6" />
        </button>

        <div className="text-center mb-6">
          <Receipt className="h-10 w-10 text-blue-600 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-gray-900">Scrap Summary</h2>
        </div>

        {selectedCategories.map((cat) => {
          const leafsInCat = selectedLeaves.filter((s) => s.category === cat);
          const bySub: Record<string, LeafSelection[]> = {};
          leafsInCat.forEach((l) => {
            bySub[l.subcategory] = bySub[l.subcategory] || [];
            bySub[l.subcategory].push(l);
          });

          const subtotal = priceBreakdown[cat]?.price || 0;
          const totalW = priceBreakdown[cat]?.weight || 0;

          return (
            <div key={cat} className="mb-5 border rounded-lg">
              <div className="px-4 py-3 bg-gray-50 rounded-t-lg font-semibold capitalize">{cat}</div>
              <div className="p-4 space-y-3">
                {Object.entries(bySub).map(([sub, items]) => (
                  <div key={sub} className="border-b pb-2">
                    <div className="font-medium text-gray-800">{sub}</div>
                    <div className="text-sm text-gray-700 space-y-1 mt-1">
                      {items.map((s) => (
                        <div key={s.leaf} className="flex justify-between">
                          <span>{s.leaf} — {s.weight.toFixed(2)} kg</span>
                          <span className="text-green-700 font-medium">₹{(s.predictedPrice || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>Total ({totalW.toFixed(2)} kg)</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="text-center mt-4 pt-4 border-t">
          <p className="text-lg font-bold text-green-700">Grand Total: ₹{predictedTotal?.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );

  /** ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">List Your Scrap</h1>
            <p className="text-gray-600">Pick category → sub-category → item, add weights, then predict.</p>
          </div>

          {/* Category buttons */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Scrap Categories</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.keys(HIERARCHY).map((cat) => (
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

          {/* Sub-category accordions and leaf chips */}
          {selectedCategories.map((cat) => (
            <div key={cat} className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 font-semibold capitalize">{cat}</div>

              <div className="divide-y">
                {Object.entries(HIERARCHY[cat]).map(([sub, leaves]) => {
                  const key = `${cat}::${sub}`;
                  const open = !!openSubcats[key];
                  return (
                    <div key={sub} className="p-4">
                      <button
                        type="button"
                        onClick={() => toggleSubcatOpen(cat, sub)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <span className="text-gray-900 font-medium">{sub}</span>
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      {open && (
                        <div className="mt-3">
                          {/* Leaf chips */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                            {leaves.map((leaf) => {
                              const isSel = !!selectedLeaves.find(
                                (s) => s.category === cat && s.subcategory === sub && s.leaf === leaf
                              );
                              return (
                                <button
                                  key={leaf}
                                  onClick={() => toggleLeaf(cat, sub, leaf)}
                                  className={`border rounded-lg p-2 text-sm transition ${
                                    isSel
                                      ? "bg-green-600 text-white border-green-600"
                                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  {leaf}
                                </button>
                              );
                            })}
                          </div>

                          {/* Weight inputs for selected leaves in this subcategory */}
                          {selectedLeaves.filter((s) => s.category === cat && s.subcategory === sub).length > 0 && (
                            <div className="space-y-3">
                              {selectedLeaves
                                .filter((s) => s.category === cat && s.subcategory === sub)
                                .map((s) => (
                                  <div key={s.leaf} className="flex items-center gap-3 border-b pb-2">
                                    <span className="w-72 text-sm font-medium text-gray-700">{s.leaf}</span>
                                    <input
                                      type="number"
                                      value={s.weight || ""}
                                      onChange={(e) =>
                                        handleWeightChange(s.category, s.subcategory, s.leaf, parseFloat(e.target.value) || 0)
                                      }
                                      placeholder="Weight (kg)"
                                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    />
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
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

          {/* Prediction */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
            <h3 className="font-semibold text-gray-800 flex items-center mb-3">
              <Zap className="h-5 w-5 text-blue-600 mr-2" />
              Price Prediction (Random Forest)
            </h3>

            {predictedTotal ? (
              <>
                <div className="text-center text-2xl font-bold text-green-600 mb-3">₹ {predictedTotal.toFixed(2)}</div>
                <button
                  onClick={() => setShowSummary(true)}
                  className="w-full bg-white border border-blue-500 text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition mb-3"
                >
                  <Receipt className="inline h-4 w-4 mr-1" />
                  View Summary
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-600 mb-3">Click below to calculate combined price.</p>
            )}

            <button
              onClick={handlePredictPrice}
              disabled={predicting || selectedLeaves.length === 0 || needsRecalc === false}
              className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex justify-center"
            >
              {predicting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" /> Predicting...
                </>
              ) : (
                <>
                  <IndianRupee className="h-4 w-4 mr-2" />
                  {needsRecalc ? "Predict Price" : "Predicted (Locked until change)"}
                </>
              )}
            </button>
          </div>

          {/* Location */}
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

          {/* Submit */}
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

      {showSummary && <SummaryModal />}
    </div>
  );
}
