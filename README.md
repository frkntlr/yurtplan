# YurtPlan

Yurt kat planını **2D** olarak çizin, kız ve erkek bölümlerini boyayın, odaları sürükleyip yerleştirin. Kapasite limitleri kaydırıcıyla ayarlanır. Plan tarayıcıda saklanır; JSON olarak indirilebilir.

## Ne işe yarar

- Bina şekli: dikdörtgen, L, U, C veya çift kanat — ya da fırçayla serbest çizim
- Kız / erkek / ortak alan boyama
- 1–6 kişilik odalar ve banyo, mutfak, salon gibi ortak yerler
- Oda taşıma, köşeden boyutlandırma, yatak sayısı ve doluluk
- Kat ekleme (şekil ve bölümler kopyalanır)
- Kız yatağı, erkek yatağı ve kat başına oda limiti

Açılışta örnek **Güneş Yurdu** planı gelir. Dosya menüsünden boş plan veya tekrar örnek yüklenebilir.

## Öğrenci yerleştirme

Üstten **2. Öğrenci yerleştir** sekmesini açın.

1. İsim yazın (virgülle birden fazla: `Ayşe, Elif, Merve`)
2. Kız / Erkek seçip **Listeye ekle**
3. Bekleyen karta tıklayın, sonra plandaki odaya tıklayın
4. Ya da kartı odaya sürükleyin
5. **Otomatik** kızları kız odalarına, erkekleri erkek odalarına doldurur

Kız öğrenci erkek odasına, erkek öğrenci kız odasına giremez. Oda dolunca yerleştirme durur.

## Yerelde çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## Vercel ile paylaşım

1. Bu depoyu GitHub’a alın
2. [vercel.com](https://vercel.com) üzerinde Import Project ile bağlayın
3. Framework olarak Next.js bırakın, deploy edin

Ek ortam değişkeni gerekmez.

## Kullanım

1. Soldan bir bina şekli seçin veya **Bina çiz** ile kareleri boyayın
2. **Kız / Erkek / Ortak** ile kanatları boyayın
3. Oda kartına tıklayıp plana yerleştirin; sürükleyerek taşıyın
4. Sağdaki kaydırıcılarla yatak ve oda tavanını ayarlayın

Kısayollar: `Ctrl+Z` geri al, `Delete` odayı sil, boşluk + sürükle kaydır, tekerlek yakınlaştır.
