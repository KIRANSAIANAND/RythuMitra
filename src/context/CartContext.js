"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query } from "firebase/firestore";

const CartContext = createContext({});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();

  // Load from Firestore when user logs in, clear when logs out
  useEffect(() => {
    let unsubscribe = () => {};

    if (user) {
      const q = query(collection(db, "carts", user.uid, "items"));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setCartItems(items);
        setIsLoaded(true);
      }, (error) => {
        console.error("Error fetching cart:", error);
        setIsLoaded(true);
      });
    } else {
      setCartItems([]);
      setIsLoaded(true);
    }

    return () => unsubscribe();
  }, [user]);

  const addToCart = async (product, quantity = 1) => {
    if (!user) {
      alert("Please log in to add items to your cart.");
      // Ideally redirect to login, but alert works for pure context scope
      return;
    }

    try {
      const itemRef = doc(db, "carts", user.uid, "items", product.id);
      const existing = cartItems.find(item => item.id === product.id);
      
      if (existing) {
        await updateDoc(itemRef, {
          quantity: existing.quantity + quantity
        });
      } else {
        await setDoc(itemRef, { ...product, quantity });
      }
    } catch (err) {
      console.error("Failed to add to cart:", err);
    }
  };

  const removeFromCart = async (productId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "carts", user.uid, "items", productId));
    } catch (err) {
      console.error("Failed to remove from cart:", err);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (!user || newQuantity < 1) return;
    try {
      const itemRef = doc(db, "carts", user.uid, "items", productId);
      await updateDoc(itemRef, {
        quantity: newQuantity
      });
    } catch (err) {
      console.error("Failed to update cart quantity:", err);
    }
  };

  const clearCart = async () => {
    if (!user) return;
    try {
      // Delete all items one by one
      for (const item of cartItems) {
        await deleteDoc(doc(db, "carts", user.uid, "items", item.id));
      }
    } catch (err) {
      console.error("Failed to clear cart:", err);
    }
  };

  const cartTotal = cartItems.reduce((total, item) => total + (Number(item.price) * item.quantity), 0);
  const itemsCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      itemsCount,
      isLoaded
    }}>
      {children}
    </CartContext.Provider>
  );
};
