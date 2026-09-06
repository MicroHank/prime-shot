# 質數裂變：因數分解防衛戰 (Prime Split: Factorization Protocol)

🎮 **2D 蜂巢陣列射擊遊戲**。發射 2~97 質數子彈進行因數分解、裂變彈跳、物理連鎖與公因數超導共鳴！支援單人無盡防守與雙人人機即時對戰 (VS AI)。

---

## 🌟 遊戲特點

- **純前端架構**：100% 原生 HTML5 Canvas + CSS + JavaScript (ES Modules)，無第三方外部套件依賴，載入秒開。
- **合成音效 (Web Audio API)**：程式碼即時合成賽博科幻音效，無需下載任何音訊資源檔。
- **豐富對戰機制**：
  - 🤖 **即時人機對戰 (VS AI)**：智慧 AI 自動評估最佳整除角度與換彈策略。
  - 🧱 **阻礙泡泡**：不可直接整除，需消除相鄰泡泡引發連鎖粉碎或使其崩塌。
  - 🚀 **反物質重型飛彈 (按 E)**：能量充能 100% 發射穿甲飛彈，造成範圍核爆與波及傷害。
  - ⚡ **公因數超導共鳴**：命中具相同質因數的泡泡將產生高壓電弧連鎖整除。

---

## 🚀 部署至 GitHub Pages (免費線上玩)

本專案為靜態網頁架構，可直接免費託管於 **GitHub Pages**：

1. **推送至 GitHub**：
   ```bash
   git init
   git add .
   git commit -m "feat: Initial commit of Prime Split Shooter"
   git branch -M main
   git remote add origin https://github.com/<你的帳號>/<你的專案名稱>.git
   git push -u origin main
   ```

2. **開啟 GitHub Pages**：
   - 前往 GitHub 專案頁面 ➜ **Settings** ➜ **Pages**。
   - 在 **Build and deployment** 下方的 **Branch** 選擇 `main`，資料夾選擇 `/ (root)`，點擊 **Save**。
   - 等待約 1 分鐘，即可透過專屬網址隨時線上遊玩：  
     `https://<你的帳號>.github.io/<你的專案名稱>/`

---

## 💻 在其他電腦本機執行

> ⚠️ **注意事項**：由於專案採用標準 JavaScript ES Modules (`import/export`)，現代瀏覽器基於 CORS 安全考量，禁止直接雙擊開啟 `file:///` 本機路徑，請透過任一本機伺服器運行。

### 方式一：Node.js (推薦)
專案內建極簡靜態伺服器（零依賴，無需 `npm install`）：
```bash
node server.js
```
瀏覽器開啟：`http://localhost:3000`

### 方式二：Python (內建指令)
```bash
python -m http.server 3000
```
瀏覽器開啟：`http://localhost:3000`

### 方式三：VS Code Live Server 擴充套件
- 在 VS Code 開啟此資料夾。
- 右鍵點擊 `index.html` 選擇 **「Open with Live Server」** 即可。

---

## 🎮 操作指南

| 操作 | 功能 |
| :--- | :--- |
| **滑鼠移動** | 控制砲台瞄準方向（附反彈瞄準射線） |
| **滑鼠左鍵** | 發射質數子彈 |
| **Q 鍵** | 切換至上一個質數 |
| **W 鍵 / 空白鍵** | 切換至下一個質數 |
| **1 ~ 4 鍵** | 快速切換主力質數 (2, 3, 5, 7) |
| **點擊左側質數庫** | 直接選取 2~97 任意質數 |
| **E 鍵** | 能量 100% 時發射重型火箭飛彈 |
| **P 鍵** | 暫停 / 繼續遊戲 |

---

## 📄 開源授權
MIT License
