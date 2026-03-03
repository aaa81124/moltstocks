import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Newspaper, 
  Calendar, 
  TrendingUp, 
  Search, 
  Bell, 
  LayoutDashboard,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

// --- Firebase 配置 ---
// 注意：環境會自動注入配置，這裡使用預留變數
const firebaseConfig = {
  apiKey: "AIzaSyBIPhr2nAeY0jCTyYUzNHP2Cqx626g23R8",
  authDomain: "moltbot-4f09a.firebaseapp.com",
  projectId: "moltbot-4f09a",
  storageBucket: "moltbot-4f09a.firebasestorage.app",
  messagingSenderId: "232072578351",
  appId: "1:232072578351:web:ffbb83902595f242350dda",
  measurementId: "G-BV2S47XHKV"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App = () => {
  const [user, setUser] = useState(null);
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. 處理身份驗證 (Rule 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. 獲取資料 (Rule 1 & 2)
  useEffect(() => {
    if (!user) return;

    // 定義公共資料路徑
    const newsRef = collection(db, 'artifacts', 'news', 'daily_news');
    const eventsRef = collection(db, 'artifacts', 'events', 'stock_events');

    // 監聽新聞資料
    const unsubNews = onSnapshot(newsRef, (snapshot) => {
      const newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 在記憶體中進行排序（遵循 Rule 2: 不在 Firestore 使用 orderBy）
      setNews(newsData.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
    }, (err) => console.error("News snapshot error:", err));

    // 監聽法說會/財報事件
    const unsubEvents = onSnapshot(eventsRef, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventsData.sort((a, b) => new Date(a.date) - new Date(b.date)));
    }, (err) => console.error("Events snapshot error:", err));

    return () => {
      unsubNews();
      unsubEvents();
    };
  }, [user]);

  // 過濾搜尋結果
  const filteredNews = news.filter(item => 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEvents = events.filter(item => 
    item.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 側邊欄元件
  const SidebarItem = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
        activeTab === id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-black text-gray-100 font-sans">
      {/* 側邊導覽列 */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6 flex flex-col space-y-8">
        <div className="flex items-center space-x-2 text-blue-500">
          <TrendingUp size={28} strokeWidth={2.5} />
          <span className="text-xl font-bold tracking-tight text-white">MoltBot Fin</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label="總覽控制台" />
          <SidebarItem id="news" icon={Newspaper} label="即時財經新聞" />
          <SidebarItem id="events" icon={Calendar} label="法說會與財報" />
        </nav>

        <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">使用者 ID</p>
          <p className="text-[10px] font-mono truncate text-blue-400">{user?.uid || '未登入'}</p>
        </div>
      </aside>

      {/* 主要內容區 */}
      <main className="flex-1 overflow-y-auto bg-gray-950 p-8">
        {/* 上方頂欄 */}
        <header className="flex justify-between items-center mb-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="搜尋公司代號、關鍵字..."
              className="w-full bg-gray-900 border border-gray-800 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-white relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-gray-950"></span>
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
              MB
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-xl">
                    <h3 className="text-blue-100 text-sm font-medium mb-1">今日重要新聞</h3>
                    <p className="text-3xl font-bold">{filteredNews.length} 則</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                    <h3 className="text-gray-400 text-sm font-medium mb-1">本週即時活動</h3>
                    <p className="text-3xl font-bold">{filteredEvents.length} 場</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                    <h3 className="text-gray-400 text-sm font-medium mb-1">監控公司數量</h3>
                    <p className="text-3xl font-bold">42 家</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <SectionCard title="最新動態" icon={Newspaper}>
                    <div className="space-y-4">
                      {filteredNews.slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-start space-x-4 p-3 hover:bg-gray-800 rounded-xl transition-colors cursor-pointer group">
                          <div className="bg-blue-900/30 p-2 rounded-lg text-blue-400">
                            <Clock size={16} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-blue-400 transition-colors">{item.title}</h4>
                            <div className="flex items-center text-xs text-gray-500 mt-1 space-x-2">
                              <span>{item.company}</span>
                              <span>•</span>
                              <span>{item.date}</span>
                            </div>
                          </div>
                          <ExternalLink size={14} className="text-gray-600" />
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard title="即將到來日程" icon={Calendar}>
                    <div className="space-y-4">
                      {filteredEvents.slice(0, 5).map(event => (
                        <div key={event.id} className="flex items-center justify-between p-3 border border-gray-800 rounded-xl hover:border-gray-600 transition-all bg-gray-900/50">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${event.type === '法說會' ? 'bg-purple-500' : 'bg-green-500'}`}></div>
                            <div>
                              <p className="font-bold text-sm">{event.company}</p>
                              <p className="text-xs text-gray-500">{event.type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono text-blue-400">{event.date}</p>
                            <p className="text-[10px] text-gray-600">{event.time || '全天'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              </div>
            )}

            {activeTab === 'news' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                  <Newspaper className="text-blue-500" />
                  <span>即時財經新聞總覽</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredNews.map(item => (
                    <div key={item.id} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl hover:border-blue-500 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-blue-600/20 text-blue-400 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                          {item.category || '市場'}
                        </span>
                        <span className="text-xs text-gray-500">{item.date}</span>
                      </div>
                      <h3 className="font-bold text-lg leading-snug group-hover:text-blue-400 transition-colors cursor-pointer mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                        {item.summary || "點擊查看更多關於此條財經新聞的詳細內容與市場分析。"}
                      </p>
                      <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                        <span className="text-xs font-semibold text-gray-300">{item.company}</span>
                        <button className="text-blue-500 flex items-center text-xs font-bold hover:underline">
                          閱讀全文 <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                  <Calendar className="text-blue-500" />
                  <span>重要行事曆日程</span>
                </h2>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-widest">
                        <th className="px-6 py-4 font-semibold">日期</th>
                        <th className="px-6 py-4 font-semibold">公司</th>
                        <th className="px-6 py-4 font-semibold">活動類型</th>
                        <th className="px-6 py-4 font-semibold">備註</th>
                        <th className="px-6 py-4 font-semibold">狀態</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {filteredEvents.map(event => (
                        <tr key={event.id} className="hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-sm text-blue-400">{event.date}</td>
                          <td className="px-6 py-4 font-bold">{event.company}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                              event.type === '法說會' ? 'bg-purple-900/50 text-purple-300' : 'bg-emerald-900/50 text-emerald-300'
                            }`}>
                              {event.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">{event.note || '--'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1 text-gray-500 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse"></span>
                              <span>待追蹤</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
    <div className="p-5 border-b border-gray-800 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <Icon size={18} className="text-blue-500" />
        <h3 className="font-bold text-gray-200">{title}</h3>
      </div>
      <button className="text-xs text-blue-500 hover:text-blue-400 font-semibold">查看全部</button>
    </div>
    <div className="p-4 flex-1">
      {children}
    </div>
  </div>
);

export default App;