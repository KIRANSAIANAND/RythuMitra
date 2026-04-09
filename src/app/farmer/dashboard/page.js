"use client";

import Link from "next/link";
import { PlusCircle, Package, TrendingUp, IndianRupee, Clock, Loader2, Trash2, Pencil, Check, X, Leaf } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [stats, setStats] = useState([
    { title: "Total Products", value: "0", icon: <Package size={20} />, color: "bg-blue-100 text-blue-600" },
    { title: "Avg Freshness", value: "0%", icon: <TrendingUp size={20} />, color: "bg-green-100 text-green-600" },
    { title: "Sales This Month", value: "₹0", icon: <IndianRupee size={20} />, color: "bg-yellow-100 text-yellow-600" },
    { title: "Pending Orders", value: "0", icon: <Clock size={20} />, color: "bg-orange-100 text-orange-600" }
  ]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "products"),
      where("farmerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = [];
      let totalFreshness = 0;
      snapshot.forEach((d) => {
        const data = d.data();
        if (!data.autoRemoved) {
          fetched.push({ id: d.id, ...data });
          totalFreshness += (data.freshness || data.freshnessScore || 0);
        }
      });
      setProducts(fetched);
      const avg = fetched.length > 0 ? Math.round(totalFreshness / fetched.length) : 0;
      setStats(prev => [
        { ...prev[0], value: fetched.length.toString() },
        { ...prev[1], value: `${avg}%` },
        prev[2],
        prev[3]
      ]);
      setLoading(false);
    }, (err) => {
      console.error("Dashboard snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditQty(item.quantity || "");
  };

  const saveEdit = async (id) => {
    try {
      await updateDoc(doc(db, "products", id), { quantity: editQty });
    } catch (e) { console.error(e); }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const deleteProduct = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (e) { console.error(e); }
    setDeletingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
          <p className="text-gray-500">Welcome back{user?.displayName ? `, ${user.displayName}` : ''}. Here's your farm summary.</p>
        </div>
        <Link 
          href="/farmer/add-product" 
          className="bg-agri-green hover:bg-agri-dark text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold flex items-center justify-center gap-2"
        >
          <PlusCircle size={20} />
          Add New Product
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-agri-green animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className={`p-4 rounded-xl ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Products */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Your Recent Listings</h2>
            </div>
            
            {products.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No products listed yet</h3>
                <p className="text-gray-500 mb-4">Start by adding your first product using voice AI.</p>
                <Link href="/farmer/add-product" className="text-agri-green font-bold hover:underline">Add Product →</Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-black overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Product</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Quantity</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Price</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Freshness</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Status</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 font-medium text-gray-900 flex items-center gap-3">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          )}
                          {item.name}
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {editingId === item.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editQty}
                                onChange={e => setEditQty(e.target.value)}
                                className="w-24 px-2 py-1 border border-emerald-400 rounded-lg text-sm font-medium outline-none"
                                autoFocus
                              />
                              <button onClick={() => saveEdit(item.id)} className="text-emerald-600 hover:text-emerald-800">
                                <Check size={16} />
                              </button>
                              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-700">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="py-4 px-6 text-gray-600">₹{item.price}</td>
                        <td className="py-4 px-6">
                          <span className="text-agri-green font-bold">{item.freshness || item.freshnessScore || 95}%</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Active</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Edit quantity"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeletingId(item.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete product"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600 w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Product?</h3>
            <p className="text-gray-500 text-center text-sm mb-6">This will permanently remove the listing from the marketplace.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 border border-gray-200 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => deleteProduct(deletingId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

