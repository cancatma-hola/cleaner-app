# cleaner

Disk temizleme uygulaması (Electron + React + TypeScript) — **macOS ve Windows**.

- **Kullanılmayanlar** — belirlenen günden uzun süredir açılmamış/değiştirilmemiş dosyalar
- **Yinelenler** — içerik hash'i (SHA-1) aynı olan kopyalar
- **Büyük Dosyalar** — eşik üzerindeki dosyalar
- **Benzer Resimler** — algısal hash (aHash) ile benzer görseller
- **Sistem Temizliği** — geçici dosyalar, tarayıcı önbellekleri (Chrome/Edge/Brave/Firefox),
  hata raporları, shader önbelleği, Windows Update indirme önbelleği, geliştirici önbellekleri
  (npm/pip/yarn/electron) ve Geri Dönüşüm Kutusu

Dosya listelerinden silinenler **Çöp / Geri Dönüşüm Kutusuna** taşınır (geri alınabilir).
Sistem Temizliği hedefleri ise **kalıcı** silinir; onay adımı vardır.

## Windows notları

- Varsayılan tarama kökü kullanıcı klasörüdür (`C:\Users\<ad>`); `AppData`, `OneDrive`,
  `NTUSER.DAT*`, `pagefile.sys` vb. varsayılan olarak dışlanır. OneDrive dışlanır çünkü
  "isteğe bağlı" dosyaların hash'lenmesi onları buluttan indirir.
- `Windows Temp` ve `Windows Update` hedefleri yalnız uygulama **yönetici olarak** çalıştırılınca
  tamamen temizlenir; aksi halde kısmen temizlenir ve atlanan dosya sayısı gösterilir.
- Geçici dosyalarda son 24 saatte oluşturulan/değiştirilen dosyalar korunur.
- Sistem Temizliği symlink/junction takip etmez, yalnız tanımlı hedef klasörlerin **içeriğini**
  siler; renderer yol göndermez, yalnız hedef kimliği gönderir.

## Geliştirme

```bash
npm install
npm run dev        # geliştirme modu
npm test           # birim testleri (vitest)
npm run typecheck
```

### Duman testi (UI, ekran görüntülü)

Uygulamayı geçici bir `userData` ile açar, ekranları gezer, PNG + metin dökümü alır ve kapanır.
Sistem Temizliği'nde **hiçbir şey silmez** (yalnız analiz).

```powershell
$env:CLEANER_SMOKE_OUT  = "C:\temp\smoke-out"     # zorunlu — smoke modunu açar
$env:CLEANER_SMOKE_SCAN = "C:\temp\test-klasoru"  # opsiyonel — bu klasörü tarar
$env:CLEANER_SMOKE_TRASH = "1"                     # opsiyonel — bulunan kopyaları çöpe taşır
npm run smoke
```

## Paketleme

```bash
npm run build:win    # NSIS kurulum (dist/)
npm run build:mac
npm run build:linux
```
