/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coffee,
  User,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Download,
  RefreshCw,
  TrendingUp,
  Search,
  Check,
  Info,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { MenuItem, Order, Stats, AggregatedOrder } from './types';

// --- GAS 原始 API 網址設定 ---
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbxBEQgnAYKOMk0xlL8UxWqvdEKcFP8I2MyAXIRSKkQLmVQ3EFoOjaI-LEkJ7nzDGqkoeA/exec";

// --- 預設茶飲工作表菜單 ---
const FALLBACK_MENU: MenuItem[] = [
  { name: "茉莉奶香綠茶", price: 45, category: "人氣特調", description: "優選新鮮茉莉花茶葉，搭配香醇鮮奶，絕妙清爽質感" },
  { name: "波霸厚黑糖奶茶", price: 65, category: "經典奶茶", description: "精熬手工黑糖波霸，完美融入經典紅玉奶茶內，甜而不膩" },
  { name: "四季春純茶", price: 35, category: "現萃鮮茶", description: "金黃明亮茶湯，香氣悠揚高雅，喉韻回甘甘甜" },
  { name: "手作鮮芋頭鮮奶", price: 75, category: "人氣特調", description: "香濃大甲芋頭熬煮搗泥，大方注入香醇純鮮奶" },
  { name: "百香雙響炮", price: 60, category: "熱帶特調", description: "新鮮百香果粒果汁，搭配香Q波霸與嫩滑椰果，口感百分百" },
  { name: "芝士草莓蓋奶", price: 85, category: "芝士蓋奶", description: "濃郁頂級進口芝士鹽奶蓋，鋪在酸甜草莓與茉莉綠茶冰沙上" },
  { name: "日式宇治抹茶拿鐵", price: 70, category: "經典奶茶", description: "正宗宇治靜岡抹茶粉，搭配絲滑小農鮮乳，微苦回甘" },
  { name: "紅柚翡翠啵啵", price: 65, category: "熱帶特調", description: "滿滿新鮮葡萄柚果肉，搭配翡翠綠茶與寒天啵啵，沁涼首選" },
  { name: "凍頂烏龍拿鐵", price: 60, category: "經典奶茶", description: "經典重焙火凍頂烏龍茶，遇上濃醇鮮奶，完美交織炭焙香" },
  { name: "手熬黑糖仙草凍奶", price: 55, category: "現萃鮮茶", description: "萬丹仙草慢火熬煮，柔嫩滑順，夏季消暑降火聖品" }
];

// --- 預設展示數據，防止起始空框 ---
const DEFAULT_ORDERS_DEMO: Order[] = [
  { orderId: "demo-1", timestamp: new Date().toISOString(), name: "主揪 阿翔", drink: "波霸厚黑糖奶茶", sugar: "微糖", ice: "少冰", quantity: 2, totalPrice: 130 },
  { orderId: "demo-2", timestamp: new Date().toISOString(), name: "設計師 妙妙", drink: "芝士草莓蓋奶", sugar: "半糖", ice: "去冰", quantity: 1, totalPrice: 85 },
  { orderId: "demo-3", timestamp: new Date().toISOString(), name: "工程師 小廖", drink: "四季春純茶", sugar: "無糖", ice: "正常冰", quantity: 3, totalPrice: 105 },
  { orderId: "demo-4", timestamp: new Date().toISOString(), name: "秘書 晴晴", drink: "百香雙響炮", sugar: "微糖", ice: "少冰", quantity: 1, totalPrice: 60 }
];

const SUGAR_OPTIONS = ["正常糖", "七分糖", "半糖", "微糖", "無糖"];
const ICE_OPTIONS = ["正常冰", "少冰", "微冰", "去冰", "溫熱"];

// 姓名雜湊生成 Avatar 顏色
function getAvatarColor(name: string): string {
  if (!name) return "bg-slate-400";
  const colors = [
    "bg-teal-500", "bg-sky-500", "bg-amber-500", "bg-rose-500", 
    "bg-indigo-500", "bg-emerald-500", "bg-orange-500", "bg-violet-500"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function App() {
  // 核心狀態
  const [apiUrl, setApiUrl] = useState<string>(() => {
    return localStorage.getItem("order_api_url") || DEFAULT_API_URL;
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [menu, setMenu] = useState<MenuItem[]>(FALLBACK_MENU);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 篩選
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>("all");

  // 編輯對象
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // 表單數據
  const [formData, setFormData] = useState({
    name: "",
    drink: "",
    sugar: "半糖",
    ice: "少冰",
    quantity: 1,
    totalPrice: 0
  });

  const categories = useMemo(() => {
    const list = ["all", ...new Set(menu.map(item => item.category))];
    return list;
  }, [menu]);

  const [activeFormCategory, setActiveFormCategory] = useState<string>("all");

  // 初始化拉取
  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(apiUrl, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`回傳狀態碼錯誤: ${response.status}`);
      }

      const data = await response.json();
      setIsDemoMode(false);
      
      if (data.menu && data.menu.length > 0) {
        setMenu(data.menu);
      } else {
        setMenu(FALLBACK_MENU);
      }

      if (data.orders) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.warn("後端 API 連線或 CORS 限制，進入本機調試模式:", err);
      setIsDemoMode(true);
      setError("無法成功連線至 GA S 試算表 API 機制，已自動為您加載本地體驗模式（資料將儲存在 LocalStorage 中）。");
      
      const localData = localStorage.getItem("local_orders_data");
      if (localData) {
        setOrders(JSON.parse(localData));
      } else {
        setOrders(DEFAULT_ORDERS_DEMO);
        localStorage.setItem("local_orders_data", JSON.stringify(DEFAULT_ORDERS_DEMO));
      }
      setMenu(FALLBACK_MENU);
    } finally {
      setIsLoading(false);
    }
  };

  // 監聽飲料與數量
  useEffect(() => {
    const selectedDrink = menu.find(item => item.name === formData.drink);
    if (selectedDrink) {
      setFormData(prev => ({
        ...prev,
        totalPrice: selectedDrink.price * prev.quantity
      }));
    }
  }, [formData.drink, formData.quantity, menu]);

  // 設定起始飲料
  useEffect(() => {
    if (menu && menu.length > 0 && !formData.drink) {
      setFormData(prev => ({
        ...prev,
        drink: menu[0].name,
        totalPrice: menu[0].price
      }));
    }
  }, [menu]);

  // 漂浮提示彈出
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setActionMessage({ text: message, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // 送出與修改
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("請輸入訂購人主管姓名或暱稱！", "error");
      return;
    }

    setIsSubmitting(true);

    const postPayload = {
      action: editingOrder ? "update" : "create",
      data: editingOrder 
        ? { orderId: editingOrder.orderId, ...formData }
        : formData
    };

    if (isDemoMode) {
      let updated: Order[] = [...orders];
      if (editingOrder) {
        updated = orders.map(o => o.orderId === editingOrder.orderId 
          ? { ...o, ...formData, totalPrice: formData.totalPrice }
          : o
        );
        showToast("[離線模式] 訂單規格已成功重設！");
      } else {
        const newO: Order = {
          orderId: "local-" + Date.now(),
          timestamp: new Date().toISOString(),
          ...formData
        };
        updated.unshift(newO);
        showToast("[離線模式] 成功投遞您的飲品訂單至主揪！");
      }
      setOrders(updated);
      localStorage.setItem("local_orders_data", JSON.stringify(updated));
      resetForm();
      setIsSubmitting(false);
    } else {
      try {
        await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(postPayload)
        });

        showToast("訂單已傳送處理，正在重新加載最新雲端清單...");
        resetForm();
        setTimeout(() => {
          fetchData(true);
        }, 1200);
      } catch (err) {
        showToast("送出時連線異常，請重新嘗試", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // 刪除
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("確定要將這杯飲料從今日訂單列表中刪除嗎？")) return;

    if (isDemoMode) {
      const updated = orders.filter(o => o.orderId !== orderId);
      setOrders(updated);
      localStorage.setItem("local_orders_data", JSON.stringify(updated));
      showToast("[離線模式] 飲品項目已移出！");
    } else {
      try {
        showToast("正在傳送刪除命令...");
        await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify({
            action: "delete",
            data: { orderId }
          })
        });

        setTimeout(() => {
          fetchData(true);
        }, 1200);
      } catch (err) {
        showToast("連線不穩定，刪除宣告失敗", "error");
      }
    }
  };

  // 編輯
  const handleStartEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      name: order.name,
      drink: order.drink,
      sugar: order.sugar,
      ice: order.ice,
      quantity: order.quantity,
      totalPrice: order.totalPrice
    });

    const drinkObj = menu.find(m => m.name === order.drink);
    if (drinkObj) {
      setActiveFormCategory(drinkObj.category);
    }

    const formElement = document.getElementById("order-form-container");
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 重置
  const resetForm = () => {
    setEditingOrder(null);
    setFormData(prev => ({
      ...prev,
      sugar: "半糖",
      ice: "少冰",
      quantity: 1,
      totalPrice: menu.length > 0 ? menu[0].price : 0
    }));
  };

  // 統計
  const stats: Stats = useMemo(() => {
    const totalCups = orders.reduce((sum, o) => sum + o.quantity, 0);
    const totalIncome = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const uniquePeople = new Set(orders.map(o => o.name)).size;
    
    const drinkCounts: { [key: string]: number } = {};
    orders.forEach(o => {
      drinkCounts[o.drink] = (drinkCounts[o.drink] || 0) + o.quantity;
    });
    
    let popularDrink = "無";
    let maxCount = 0;
    for (const [drink, count] of Object.entries(drinkCounts)) {
      if (count > maxCount) {
        maxCount = count;
        popularDrink = `${drink} (${count}杯)`;
      }
    }

    return { totalCups, totalIncome, uniquePeople, popularDrink };
  }, [orders]);

  // 篩選飲品明細
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = order.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          order.drink.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (selectedFilterCategory === "all") return matchesSearch;
      
      const drinkObj = menu.find(m => m.name === order.drink);
      const matchesCategory = drinkObj && drinkObj.category === selectedFilterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [orders, searchQuery, selectedFilterCategory, menu]);

  // 品項彙整（打外賣必備！）
  const aggregatedOrders: AggregatedOrder[] = useMemo(() => {
    const summary: { [key: string]: AggregatedOrder } = {};
    orders.forEach(o => {
      const key = `${o.drink} 【${o.sugar} / ${o.ice}】`;
      if (!summary[key]) {
        summary[key] = {
          drinkName: o.drink,
          sugar: o.sugar,
          ice: o.ice,
          quantity: 0,
          price: o.totalPrice / o.quantity
        };
      }
      summary[key].quantity += o.quantity;
    });
    
    return Object.values(summary).sort((a,b) => b.quantity - a.quantity);
  }, [orders]);

  // 快速點擊飲料加入
  const handleSelectDrinkInForm = (menuItem: MenuItem) => {
    setFormData(prev => ({
      ...prev,
      drink: menuItem.name,
      totalPrice: menuItem.price * prev.quantity
    }));
  };

  // 隨機我很幸運
  const handleLuckySelect = () => {
    if (menu.length === 0) return;
    const randomIndex = Math.floor(Math.random() * menu.length);
    const luckyDrink = menu[randomIndex];
    const randomSugar = SUGAR_OPTIONS[Math.floor(Math.random() * SUGAR_OPTIONS.length)];
    const randomIce = ICE_OPTIONS[Math.floor(Math.random() * ICE_OPTIONS.length)];
    
    setFormData(prev => ({
      ...prev,
      drink: luckyDrink.name,
      sugar: randomSugar,
      ice: randomIce,
      quantity: 1,
      totalPrice: luckyDrink.price
    }));
    
    setActiveFormCategory(luckyDrink.category);
    showToast(`✨ 為您推薦：${luckyDrink.name} (${randomSugar}/${randomIce})！`);
    
    const formElement = document.getElementById("order-form-container");
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  // 複製規格彙整內容
  const handleCopyHostAggSummary = () => {
    if (aggregatedOrders.length === 0) return;
    
    const textToCopy = aggregatedOrders.map((o, idx) => 
      `${idx + 1}. ${o.drinkName} (${o.sugar}/${o.ice}) x ${o.quantity} 杯`
    ).join("\n");
    
    const header = `📋 【辦公室今日飲料訂單統計】\n總杯數：${stats.totalCups} 杯 | 總金額：NT$ ${stats.totalIncome}\n-----------------------------\n`;
    const footer = `\n-----------------------------\n統計時間：${new Date().toLocaleTimeString()}`;
    
    navigator.clipboard.writeText(header + textToCopy + footer)
      .then(() => showToast("已成功將「主揪彙總報告」複製到剪貼簿！ 📱"))
      .catch(() => showToast("複製失敗，請手動圈選複製", "error"));
  };

  // 下載獨立 HTML 的神級操作：從本地撈 HTML 文字打包下載
  const handleDownloadHtmlFile = async () => {
    try {
      // 在 SPA 中，我們取得根目錄的 HTML 整包下載
      const response = await fetch("/index.html");
      const htmlText = await response.text();
      
      const blob = new Blob([htmlText], { type: "text/html;charset=utf-8" });
      const tempUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = tempUrl;
      link.download = "辦公室飲料訂購系統_單檔版.html";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(tempUrl);
      
      showToast("成功下載單一 HTML 檔案！您可以直接在本機上雙擊點開運行。");
    } catch (err) {
      showToast("找不到獨立 index.html 資源，請手動複製", "error");
    }
  };

  // 保存 API
  const handleSaveApiUrl = (newUrl: string) => {
    if (!newUrl || !newUrl.startsWith("http")) {
      showToast("請輸入有效的 HTTPS 網域網址", "error");
      return;
    }
    localStorage.setItem("order_api_url", newUrl);
    setApiUrl(newUrl);
    showToast("API 網址更新順利，重新同步中...");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased pb-20 font-sans">
      
      {/* Toast 提示 */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white font-medium bg-slate-900 border border-slate-700"
          >
            <span className={actionMessage.type === "error" ? "text-rose-400" : "text-emerald-400"}>
              {actionMessage.type === "error" ? "✕" : "✓"}
            </span>
            <span>{actionMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 漸變導航頁首 */}
      <header className="bg-gradient-to-br from-[#6366f1] to-[#a855f7] text-white relative overflow-hidden shadow-soft-xl pt-10 pb-16">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-white rounded-full blur-3xl opacity-20 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase text-white bg-white/20 border border-white/10 mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>OFFICE TEA TIME 👋</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display tracking-tight text-white flex items-center gap-3">
                <span className="p-3 bg-white/20 rounded-2xl border border-white/15 text-white">
                  <Coffee className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </span>
                <div>
                  <div className="flex items-center gap-2">辦公室飲料訂購系統 <span className="text-2xl">🥤</span></div>
                  <p className="text-[11px] opacity-80 font-normal tracking-wider mt-1">2026-05-28 星期四 • 團購下午茶時光</p>
                </div>
              </h1>
              <p className="mt-3 text-white/90 text-sm md:text-base max-w-2xl font-light">
                今天想喝什麼下午茶？請點選下方餐單快速點茶！主揪能一鍵彙整點單，打電話叫外送不費吹灰之力！
                <span className="block mt-1 font-mono text-xs text-white/80 font-medium">✨ 支援多裝置即時雲端同步</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
              {/* Vibrant theme header-stats */}
              <div className="flex items-center gap-2.5">
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-semibold text-white border border-white/10 shadow-sm">
                  份數: {stats.totalCups} 杯
                </div>
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-semibold text-white border border-white/10 shadow-sm">
                  總計: ${stats.totalIncome}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={handleDownloadHtmlFile}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl border border-white/10 transition duration-200 text-sm font-medium shadow-sm cursor-pointer"
                  title="下載獨立執行的 HTML 單一檔案"
                >
                  <Download className="w-4 h-4" />
                  <span>下載本頁 (.html)</span>
                </button>

                <button 
                  onClick={() => fetchData(false)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition duration-200 text-sm font-medium shadow-sm cursor-pointer ${
                    isLoading ? 'bg-white/20 text-slate-300' : 'bg-white text-indigo-600 hover:bg-slate-50'
                  }`}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>同步最新資料</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-white/10 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/90">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-semibold text-white">後端 API 連結試算表：</span>
              <span className="font-mono bg-black/20 px-2 py-0.5 rounded truncate max-w-xs md:max-w-md text-white/85">{apiUrl}</span>
            </div>
            <button 
              onClick={() => {
                const newU = window.prompt("請輸入您的 GAS API 部署連結：", apiUrl);
                if (newU) handleSaveApiUrl(newU);
              }}
              className="text-white hover:text-indigo-100 underline font-semibold cursor-pointer"
            >
              修改試算表 API 網址
            </button>
          </div>
        </div>
      </header>

      {/* 內容區塊 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        
        {isDemoMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 shadow-soft-lg flex items-start gap-4 text-amber-800">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-amber-950">⚠️ 目前處於 [離線體驗模式]</h3>
              <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                未能偵測到有效的網頁後端或被瀏覽器 CORS 隔離阻擋，我們已為您切換至 LocalStorage 本機機制，此時填單依然可由瀏覽器離線紀錄。
              </p>
              <div className="mt-2 flex gap-3 items-center">
                <button onClick={() => fetchData(false)} className="text-xs font-bold text-sky-700 underline cursor-pointer">重新同步</button>
              </div>
            </div>
          </div>
        )}

        {/* Bento stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md border border-slate-100/80 transition-all duration-300">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">今日熱度總杯數</p>
            <p className="text-3xl font-extrabold font-display text-[#6366f1] mt-1.5 flex items-baseline gap-1">
              {stats.totalCups} 
              <span className="text-xs font-medium text-slate-400">杯</span>
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6366f1] font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>下午茶點餐熱絡中</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md border border-slate-100/80 transition-all duration-300">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">今日茶資累計</p>
            <p className="text-3xl font-extrabold font-display text-[#f43f5e] mt-1.5 flex items-baseline gap-1">
              <span className="text-xs font-medium text-slate-400">NT$</span> {stats.totalIncome}
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>今日主揪已發單</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md border border-slate-100/80 transition-all duration-300">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">今日人氣王</p>
            <p className="text-lg font-extrabold text-slate-800 mt-1.5 truncate" title={stats.popularDrink}>
              {stats.popularDrink || "尚未產出"}
            </p>
            <div className="mt-2.5 text-xs text-amber-600 font-semibold flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>最受同仁喜愛</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md border border-slate-100/80 transition-all duration-300">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">點單不重複人數</p>
            <p className="text-3xl font-extrabold font-display text-slate-800 mt-1.5 flex items-baseline gap-1">
              {stats.uniquePeople} 
              <span className="text-xs font-medium text-slate-400">人</span>
            </p>
            <div className="mt-2.5 text-xs text-slate-500 font-medium">
              辦公室團購力量大 ☕
            </div>
          </div>
        </section>

        {/* 雙欄 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 左：填單 (OrderForm) */}
          <div id="order-form-container" className="lg:col-span-5 bg-white rounded-[20px] shadow-sm border border-slate-100 p-6 md:p-8 sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-[#6366f1]">✨</span>
                  {editingOrder ? "變更點單規格" : "填寫點單表單"}
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  調整規格以完成點餐
                </p>
              </div>
              
              {!editingOrder && (
                <button 
                  type="button"
                  onClick={handleLuckySelect}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100/80 flex items-center gap-1 cursor-pointer transition-all duration-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  <span>我很幸運 (隨機)</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {/* 訂購人 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  1. 訂購人姓名 <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5 text-[#6366f1]" />
                  </div>
                  <input
                    type="text"
                    placeholder="例如：小廖"
                    className="w-full bg-[#f1f5f9] focus:bg-white text-slate-800 font-medium pl-11 pr-4 py-3 border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-[#6366f1] transition-all duration-200"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={15}
                    required
                  />
                </div>
              </div>

              {/* 飲料選擇卡片 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    2. 挑選飲品 <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#6366f1] font-bold bg-[#e0e7ff] px-2.5 py-0.5 rounded-full">
                    選中：{formData.drink || "尚未選擇"}
                  </span>
                </div>

                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-2 px-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveFormCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        activeFormCategory === cat
                          ? "bg-[#6366f1] text-white shadow-sm shadow-indigo-500/10"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                      }`}
                    >
                      {cat === "all" ? "全部飲品" : cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 pb-1 border border-slate-100 rounded-[20px] p-2 bg-slate-50/50">
                  {menu
                    .filter(item => activeFormCategory === "all" || item.category === activeFormCategory)
                    .map((item) => {
                      const isSelected = formData.drink === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleSelectDrinkInForm(item)}
                          className={`text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isSelected 
                              ? "bg-indigo-50/70 border-indigo-400 ring-2 ring-[#6366f1]/10"
                              : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-bold text-xs text-slate-800 line-clamp-1">{item.name}</span>
                            <span className="font-extrabold text-xs text-[#6366f1] shrink-0">NT${item.price}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {item.description || "美味人氣手搖茶飲推薦"}
                          </p>
                        </button>
                      );
                  })}
                </div>
              </div>

              {/* 甜度 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  3. 甜度 (Sugar)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {SUGAR_OPTIONS.map(sugar => {
                    const isSelected = formData.sugar === sugar;
                    return (
                      <button
                        key={sugar}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, sugar }))}
                        className={`py-2 text-[11px] font-bold rounded-xl transition border cursor-pointer text-center ${
                          isSelected 
                            ? "bg-[#6366f1] border-[#6366f1] text-white shadow-md font-extrabold"
                            : "bg-white border-[#e2e8f0] hover:bg-[#f1f5f9] text-slate-600"
                        }`}
                      >
                        {sugar}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 冰塊 */}
              <div>
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">
                  4. 冰量 (Ice)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ICE_OPTIONS.map(ice => {
                    const isSelected = formData.ice === ice;
                    return (
                      <button
                        key={ice}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, ice }))}
                        className={`py-2 text-[11px] font-bold rounded-xl transition border cursor-pointer text-center ${
                          isSelected 
                            ? "bg-[#6366f1] border-[#6366f1] text-white shadow-md font-extrabold"
                            : "bg-white border-[#e2e8f0] hover:bg-[#f1f5f9] text-slate-600"
                        }`}
                      >
                        {ice}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 數量 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  5. 點茶杯數
                </label>
                <div className="flex items-center gap-4 bg-[#f1f5f9] px-4 py-2 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                    className="w-8 h-8 rounded-lg bg-white border-none flex items-center justify-center text-slate-800 disabled:opacity-40 transition-all font-bold cursor-pointer shadow-sm"
                    disabled={formData.quantity <= 1}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-slate-800">{formData.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                    className="w-8 h-8 rounded-lg bg-white border-none flex items-center justify-center text-slate-800 transition-all font-bold cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 結帳與送出 */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="bg-[#e0e7ff]/30 p-4 rounded-xl flex items-center justify-between border border-[#e0e7ff]/50">
                  <div>
                    <span className="text-xs text-[#6366f1] font-bold block">點單總費用：</span>
                    <span className="font-mono text-xs text-slate-400 mt-1 block">
                      {formData.drink || "未選飲品"} ✕ {formData.quantity} 杯
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-display text-[#6366f1] tracking-tight">
                      <span className="text-sm font-normal text-slate-500">NT$</span> {formData.totalPrice}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-white font-bold transition-all shadow-sm hover:scale-[1.01] cursor-pointer ${
                      isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-[#6366f1] hover:bg-[#5457e5]"
                    }`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>發送資料中...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>{editingOrder ? "確 認 修 改 訂 單" : "送 出 訂 單"}</span>
                      </>
                    )}
                  </button>

                  {editingOrder && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition cursor-pointer"
                    >
                      取消
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* 右：訂單一覽 (OrderList) 與大統計 */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-[#f43f5e]">📋</span>
                    <span>今日已點單</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    今天下午茶所有同仁訂單明細
                  </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-48">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="搜尋名字或品項"
                      className="w-full bg-[#f1f5f9] focus:bg-white text-xs pl-9 pr-3 py-2 border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-[#6366f1] transition-all font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <select
                    className="bg-[#f1f5f9] border border-[#e2e8f0] text-xs font-semibold text-slate-600 px-3 py-2 rounded-xl focus:outline-none cursor-pointer hover:bg-[#e2e8f0]/40 transition-all"
                    value={selectedFilterCategory}
                    onChange={(e) => setSelectedFilterCategory(e.target.value)}
                  >
                    <option value="all">所有類別</option>
                    {categories.filter(c => c !== "all").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-10 h-10 animate-spin text-[#6366f1] mx-auto" />
                  <p className="text-slate-400 text-sm">正在載入今天下午茶進度...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 px-6 text-center border-2 border-dashed border-[#e2e8f0]/60 rounded-2xl bg-[#f8fafc]/50">
                  <p className="text-3xl animate-bounce">😴</p>
                  <h3 className="text-lg font-bold text-slate-700 mt-4">目前還沒有人點餐 🥤</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                    下午工作累了嗎？快來當辦公室今天第一個點單的快樂下午茶大師！
                  </p>
                  <div className="mt-6">
                    <button 
                      type="button"
                      onClick={handleLuckySelect}
                      className="inline-flex items-center gap-1.5 bg-[#6366f1] hover:bg-[#5457e5] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>幫我推薦一杯，衝！</span>
                    </button>
                  </div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  找不到符合關鍵字 「{searchQuery}」 的訂單
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredOrders.map((item) => {
                    const initial = item.name ? item.name.charAt(0) : "無";
                    return (
                      <div 
                        key={item.orderId}
                        className={`p-4 rounded-xl border-y border-r transition hover:shadow-sm ${
                          editingOrder?.orderId === item.orderId
                            ? "bg-indigo-50 border border-indigo-200 border-l-4 border-l-[#6366f1] ring-2 ring-[#6366f1]/5"
                            : "bg-[#f8fafc] border-slate-200/50 border-l-4 border-l-[#6366f1] hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-sm ${getAvatarColor(item.name)}`}>
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-800 text-sm truncate block">{item.name}</span>
                              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-slate-800">{item.drink}</span>
                                <span className="text-slate-300">|</span>
                                <span className="bg-[#e0e7ff] text-[#6366f1] px-1.5 py-0.5 rounded text-[10px] font-bold">{item.sugar}</span>
                                <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{item.ice}</span>
                                <span className="text-slate-600 font-bold shrink-0">✕ {item.quantity}杯</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t border-slate-100 sm:border-0 pt-2.5 sm:pt-0">
                            <div className="text-left sm:text-right">
                              <div className="text-sm font-extrabold text-slate-800">NT$ {item.totalPrice}</div>
                              <span className="text-[10px] text-slate-400">NT$ {item.totalPrice / item.quantity}/杯</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="p-2 bg-[#dbeafe] text-[#2563eb] rounded-lg hover:bg-blue-200 transition duration-150 cursor-pointer"
                                title="編輯"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(item.orderId)}
                                className="p-2 bg-[#fee2e2] text-[#dc2626] rounded-lg hover:bg-red-200 transition duration-150 cursor-pointer"
                                title="刪除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 主揪規格合併 */}
            {orders.length > 0 && (
              <div className="bg-slate-900 rounded-[20px] text-white shadow-md border border-slate-800/80 p-6 md:p-8">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full mb-1">
                      主揪打電話神物 📱
                    </span>
                    <h3 className="text-lg font-bold">點餐品項規格一鍵彙整</h3>
                  </div>

                  <button 
                    onClick={handleCopyHostAggSummary}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    <span>📋</span>
                    <span>複製呼叫清單</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400 mb-4 font-light leading-relaxed">
                  系統已將完全一致的「飲料 + 甜度 + 冰量」合併累計，撥打給手搖飲料店外送時，直接看這裏呼叫，效率加倍！
                </p>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {aggregatedOrders.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs bg-slate-800/40 border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-slate-400 shrink-0">
                          {index + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-slate-100 block truncate">{item.drinkName}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {item.sugar} / {item.ice}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="bg-[#6366f1]/10 text-[#a5b4fc] text-xs font-bold px-2 py-1 rounded border border-[#6366f1]/20">
                          {item.quantity} 杯
                        </span>
                        <span className="text-slate-400 font-mono">
                          NT$ {item.price * item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">目前總計杯數：</span>
                  <span className="font-bold font-display text-base text-white">
                    共 {stats.totalCups} 杯 ➔ NT$ {stats.totalIncome} 元
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      <footer className="mt-20 border-t border-slate-200 py-8 text-center text-slate-400 text-xs">
        <p className="font-medium text-slate-500">🥤 辦公室下午茶點餐小幫手 - 讓每次團購都精準無痛</p>
        <p className="mt-2 font-mono text-[10px] text-slate-400">
          Powered by React & Tailwind CSS. All rights reserved 2026.
        </p>
      </footer>
    </div>
  );
}
