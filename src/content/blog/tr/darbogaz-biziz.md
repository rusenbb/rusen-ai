---
title: "Darboğaz Biziz"
date: "2026-11-16"
description: "Yapay zekâ ile çalışırken bir noktadan sonra sorunları kendimde aramaya başladım. Araştırma yaparken ise işler biraz karışıyor."
tags:
  - "yapay zeka"
  - "ajanlar"
  - "araştırma"
  - "reinforcement learning"
translationKey: "we-are-the-bottleneck"
seriesId: "ai-programming"
seriesOrder: 4
audio:
  src: "/audio/blog/darbogaz-biziz.m4a"
  durationSeconds: 789
---

# Darboğaz Biziz

*Yapay zekâ ile çalışırken bir noktadan sonra sorunları kendimde aramaya başladım. Araştırma yaparken ise işler biraz karışıyor.*

Daha önceki yazılarımda gerekli bağlamı verdiğimiz zaman yapay zekâ ajanlarının bizden daha iyi iş yapabildiğinden bahsetmiştim. O zamandan beri bu araçları kullandıkça bir düşünce aklımda daha fazla yankılanıyor: bence darboğaz artık biziz.

En azından ben kendi adıma konuşayım, bayağı bir darboğazım.

Yapay zekâ ajanlarının hızına yetişemiyorum. Bildikleri her şeyi bilmiyorum, bilmedikleri şeyleri de onlar kadar hızlı araştırıp öğrenemiyorum. Ürettikleri kodun tamamına aynı ölçüde hâkim değilim. Bazen verdikleri cevabı bile tam okumuyorum (okuyacak hıza veya kimi zaman anlayacak yetkinliğe sahip değilim). Sonra bir şey istediğim gibi olmayınca dönüp modele kızıyorum. Ama konuşmayı biraz açınca fark ediyorum ki, kafamda olduğunu sandığım şeyin yarısını söylememişim.

Kalan yarısını da kendim pek bilmiyormuşum :)

Peki bütün mesele bu mu? Daha iyi öğrenir, daha açık konuşur ve bütün çıktıları okuyup anlarsak sorun çözülüyor mu?

Mühendislikte benim deneyimim büyük ölçüde bu yönde. (Araştırmada ise aynı yaklaşım tutmuyor. Yazının ilerleyen kısımlarında buna değineceğim.)

## Ben Yetişemiyorum

AI ile mühendislik yaparken artık pek sıkışmıyorum. Bir şey çalışmıyorsa neden çalışmadığını konuşuyoruz. Açıklamayı anlamadıysam daha basit anlatmasını istiyorum. Anlayınca da bazen fark ediyorum ki, ben sorunu bile düzgün tarif etmemişim. Onu düzeltiyoruz, devam ediyoruz. Bazen birkaç tur sürüyor ama günün sonunda bir yere varıyoruz.

Bu döngü o kadar iyi çalışıyor ki, artık kötü bir çıktı görünce modele kızmadan önce kendime bakmaya başladım. Gerçekten ne istediğimi söyledim mi? Gerekli bağlamı verdim mi? Verdiği cevabı okudum mu, okuduysam anladım mı? Yoksa modelin yapmasını istediğim şeyi ben de tam bilmiyor muyum?

Sonuncusu bir tık can sıkıcı. Çünkü bilmediğiniz şeyin eksikliğini fark etmek de kolay değil. Bir konuda neyin mümkün olduğunu bilmiyorsanız, AI’dan isteyeceğiniz şey de ona göre şekilleniyor. Belki gayet rahat yapabileceği bir şeyi, yapılabileceği aklınıza gelmediği için hiç istemiyorsunuz. Elinizdeki kapasitenin bir kısmını daha konuşmaya başlamadan kendi bilginizle sınırlamış oluyorsunuz, üzücü.

Bir de bildiğiniz şeylere yetişme meselesi var. Model kodu değiştiriyor, neden değiştirdiğini açıklıyor, bir sonraki adıma geçiyor. Siz ise daha önceki değişikliği anlamaya çalışıyorsunuz. Ya da açıklamayı hızlıca okuyup genel fikri aldığınızı düşünüyorsunuz, ama önemli bir ayrıntıyı kaçırmışsınız. Sonra o ayrıntının üzerine başka kararlar geliyor.

Böyle böyle, sizin kafanızdaki proje ile kodun gerçek hâli birbirinden uzaklaşıyor. AI ise nerede koptuğunuzu bilmiyor. Yazdığı şeyi okuduğunuzu, anladığınızı ve aynı noktadan devam ettiğinizi varsayabiliyor. Hâlbuki siz daha birkaç adım geridesiniz. Bunu fark edip anlatmak da yine size düşüyor.

Daha önce “Prompt Yetmez” yazısında niyet ile komutun aynı şey olmadığından bahsetmiştim. Burada o mesafenin bir kısmını ben oluşturuyorum işte. Ne istediğimi eksik anlatıyorum, cevabın bir kısmını kaçırıyorum, sonra da kafamdaki sonucu bekliyorum. Model benim kafamda ne olduğunu nereden bilsin? Elinde ona söylediğim şey var ve onu gayet başarılı bir şekilde yapıyor. Yanlış şeyi istemişsem, yanlış şeyi başarıyla yapıyor. (Aferin ona)

Sonra da kendimize soruyoruz:

> Bu kadar zekâyla neden bu kadar saçma bir şey yaptık?

Çünkü neyin önemli olduğunu doğru aktaramadık. Bazen kendimiz de anlamadık.

Buraya kadar bakınca, “önce kendimizi geliştirelim” demek gayet mantıklı. Daha çok öğrenelim, ne istediğimizi anlayalım, daha iyi iletişim kuralım. Bunların hepsine katılıyorum.

Ama bu bir mühendis kafası. Biraz da bilim insanı gözüyle bakalım.

## Ben Zaten Ne İstediğimi Bulmaya Çalışıyorum

Araştırmada bazen ne istediğimi bilmiyorum.

Bir şey dikkatimi çekiyor. Bir sonuç tuhaf geliyor, sanki öyle olmaması gerek. Bir açıklama içime sinmiyor. Henüz düzgün bir argümanım yok, ama orada, tam orada, uğraşmaya değer bir şey olduğunu hissediyorum. Konuşmak istiyorum. Biraz kurcalamak, başka bir yerden bakmak, belki de düşüncemin saçma olduğunu anlamak istiyorum. Bazen bunu anlamak bile araştırmadaki büyük resmin bir parçası olabiliyor.

AI’a gidiyorum ve karşıma bir plan çıkıyor.

Literatüre bakalım. Sonra hedefimizi netleştirelim. Daha sonra başarı kriterini belirleyelim. Ardından üç alternatif üretip karşılaştıralım. Hangi seçeneği tercih edersiniz? Trade-off’lar böyle böyle.

İyi de ben daha ne düşündüğümü anlamadım.

Bu yazıyı hazırlarken de tam olarak bunu yaşadım. “Darboğaz artık biziz gibi hissediyorum” dedim. Biraz sohbet ettik, sonra düşüncemi geliştirmek için “beni biraz daha sorgular mısın?” diye sordum.

Beş maddelik bir soru listesi geldi.

Soruların her biri kendi başına anlamlı idi. Ama bir araya gelince düşünmekten çok form dolduruyormuşum gibi hissettirdi. İddiamın kapsamını seçmem, ne kadar güçlü savunduğumu belirlemem, karşı örnek bulmam vs. gerekiyordu. Sanki düşüncem kafamda hazırdı da AI’ın düzgün işlemesi için gerekli alanları doldurmam bekleniyordu. Sanki... bir optimizasyonun parçası gibi hissettim.

Ben de sorulara cevap vermek yerine, bunun beni neden rahatsız ettiğini ve istediğim düşünce sürecinin bir parçası olmadığını anlattım.

Ve asıl konuşma orada başladı.

## Biraz Belirsiz Kalsa Olmaz Mı?

Netlik istemekte sorun yok. Yanlış anlaşılmak istemiyorum, düşüncelerimiz hep dağınık kalsın ve hiçbir yere varmayalım demiyorum. Ama yapay zekâ netliği öyle bir iştahla istiyor ki, bazen düşünce daha oluşmadan onu sabitlemeye çalışıyor.

Her şeyi bir göreve dönüştürmek istiyor. Bir çıktı üretelim, bir karar verelim, bir plan yapalım. Hadi artık bir yere varalım!

Ben ise bazen biraz daha orada kalmak istiyorum. Çünkü daha ne düşündüğümü anlamadım, hemen bir yere varmak zorunda mıyız?

Başta önemli bulduğum şey, konuşurken önemini kaybediyor. Bir tangent açılıyor, ilk sorudan daha ilginç bir yere gidiyoruz. Kendi söylediğim bir şeye itiraz etmeye başlıyorum. Bunlar düşünce sürecinin gayet normal parçaları. Ben zaten biraz bunları yaşamak için konuşuyorum. Kafamda hazır olan bir fikri sadece düzgün cümlelere döktürmek istemiyorum ki.

AI ise benden önce soruyu bulmamı, neden önemli olduğunu açıklamamı, nasıl değerlendireceğimizi belirlememi bekliyor. Bunları halledince gayet güzel yardımcı olacak. Ama o noktaya gelene kadar işin önemli bir kısmını bana geri vermiş oluyor.

E, bunların hepsini ben yapacaksam, araştırmanın önemli bir kısmını zaten yapmış olmuyor muyum?

## Problem Çözme Canavarları

Bence bunun eğitimle bir ilişkisi var. Özellikle RL ile. Benim hipotezim şu: ajanları sürekli belirli görevlerde başarılı olmaları için eğittikçe, her şeye tamamlanması gereken bir görev olarak bakma eğilimini de güçlendiriyoruz.

Problemi ver. Çözümü üret. Sonucu değerlendir. Daha iyi yap.

Ve gerçekten çok iyi yapıyorlar. Matematikte, kodda, düzgünce tarif edebildiğim mühendislik işlerinde bunu görüyorum. Bu sistemler bildiğiniz problem çözme canavarlarına dönüştü. Buraya kadar bir şikâyetim yok, aksine bütün bu yazının çıkış noktası zaten bu.

Ama gerçek hayatın tamamı önümüze konulan problemleri çözmekten oluşmuyor. Hangi probleme zaman ayıracağımızı da seçiyoruz. Bazen uğraşırken problemin kendisi değişiyor. Başta başarı diye tanımladığımız şeyin artık o kadar önemli olmadığını fark ediyoruz.

Araştırmada bir sonucu iyileştirmeye çalıştığınızı düşünün. Sonuçları incelerken tuhaf bir şey gördünüz. İlk hedefinize ulaşmak için bununla uğraşmanız gerekmiyor, hatta sizi yavaşlatacak. Ama merak ettiniz, peşinden gittiniz. Sonunda çalışmanın asıl değerinin orada olduğunu fark ettiniz.

İlk hedefe göre bakarsanız yoldan çıktınız. İyi ki de çıktınız. Başta yazdığınız plana harfiyen uysaydınız, çalışmanın en ilginç kısmını görmeden geçecektiniz.

Kendi hedeflerini üreten ve farklı problemlere geçen sistemler üzerine [çalışmalar var](https://proceedings.mlr.press/v119/wang20l.html). Yani RL ile hedef değiştirmek imkânsız diye bir şey söylemiyorum. Benim takıldığım, kullandığım ajanların bu görev tamamlama iştahı. Bir şeyi bitirmek konusunda çok istekliler. O şeyin hâlâ yapılmaya değer olup olmadığını konuşmaya gelince aynı beceriyi göremiyorum.

## Neyi Optimize Ediyoruz?

Burada exploration–exploitation ayrımı aklıma geliyor. Kabaca, yeni şeyler deneyip nerede değer olduğunu öğrenmek ve bulduğunuz değerden yararlanmak.

Benim AI ile yaşadığım fark buna benziyor. Ne istediğimi biliyorsam, onu elde etmek konusunda müthiş yardım alıyorum. Ama hangi yöne gitmeye değer olduğunu birlikte düşünmeye çalıştığımızda işler bozuluyor. Ne yapacağını söyleyince çok iyi, ne yapmaya değer olduğunu konuşmak isteyince aynı ölçüde iyi değil.

Fikir üretemediği için mi? Hayır, fikir konusunda gayet cömertler. İsterseniz elli tane verir. Yetmediyse yüz tane de verir. Üstelik her biri “umut verici”, her birinde çalışılabilecek bir şey var. (Hepsi bu kadar umut vericiyse ben neden hiçbirini yapmak istemiyorum?)

Benim yüz fikre ihtiyacım yok. Bir tanesinin neden gerçekten uğraşmaya değer olduğunu anlamak istiyorum. Hangisinde bir şey var, hangisi sadece kulağa hoş geliyor? Neye zaman ayırırsam anlamlı bir şey öğrenebilirim?

Burada exploration’ı biraz geniş anlamda kullanıyorum. Bildiğimiz bir hedefe ulaşmanın farklı yollarını denemenin yanında, hedefin kendisini de kurcalıyoruz. Neyin önemli olduğuna dair fikrimiz değişebiliyor.

Bir nevi, **neyin optimize edilmeye değer olduğunu bulmaya çalışıyoruz.**

Bence araştırmada eksikliğini hissettiğim şey bu. AI’a hangi yönde ilerleyeceğini düzgün anlatırsam çok hızlı ilerliyor. Ama bazen ben de yönü bilmiyorum. O yönü birlikte bulmak için konuşuyorum zaten. Bana tekrar nereye gitmek istediğimi sorunca başladığımız yere dönüyoruz.

## Bunun Skill’i Yok Mu?

Peki bunu da bir skill olarak yazamaz mıyız? Sonuçta yapılması gereken belli gibi gözüküyor: belirsizlik varsa biraz araştır, alternatifleri düşün, gerekirse hedefi sorgula. Bir şey ilginç görünüyorsa hemen eleme, yön değiştirmekten korkma vs.

Yazabiliriz tabii. Ama bu talimattaki “gerekirse” kelimesini kim çözecek?

Ne zaman biraz daha uğraşmalıyız? Ne zaman bu fikri bırakmalıyız? Şu anda ilginç bulduğumuz şey gerçekten ilginç mi, yoksa sadece henüz anlamadığımız için mi öyle geliyor? Bu tangent bize bir şey öğretiyor mu, yoksa çalışmaktan mı kaçıyoruz? (O da mümkün, kendimizi kandırmayalım.)

Bunları “önce üç alternatif listele” diyerek halledemiyoruz.

Hatta böyle bir skill ile aynı sorunu daha düzenli bir şekilde yaşayabiliriz. Alternatifler çıkar, artılar ve eksiler yazılır, bir seçenek önerilir. Önümüzde tertemiz bir tablo vardır. Ama dönüp baktığımızda hâlâ neden o seçeneği takip etmemiz gerektiğini anlamamışızdır. Bir sürü şey yazılmıştır, biz pek bir şey öğrenmemişizdir.

Benim istediğim muhakeme burada. Ne zaman netleştirmek, ne zaman araştırmaya devam etmek ve ne zaman yön değiştirmek gerektiğini anlayabilmek. Bunun öğrenilemeyeceğini düşünmüyorum. Ama prosedürü yazıp dosyaya koyunca, o muhakemeyi de kazandırmış olmuyoruz.

Çünkü bazen bir fikrin değerini görmek için onunla biraz uğraşmak gerekiyor. Daha baştan kendisini kanıtlamasını bekliyorsanız, ona o fırsatı hiç vermiyorsunuz. Belki gerçekten boş çıkacak, belki algınızı genişletip başka sorular doğuracak, belki de yazının başında tarif edemediğiniz şeyin neden peşinize takıldığını anlayacaksınız. Bunu öğrenmek de zaman istiyor.

## Peki Darboğaz Kim?

Bu yazıya başlarken cevabım daha kesindi: biziz.

Kendi kullanımımın önemli bir kısmında hâlâ bu kanaatteyim. AI’ın hızına yetişemiyorum. Bilgim, dikkatim ve kendimi ifade etme biçimim, ondan ne kadar yararlanabildiğimi kısıtlıyor. Bunları geliştirmek benim işim, burada modele kızmamın pek bir faydası da yok.

Ama araştırmada her başarısızlığı “yeterince açık anlatamadım” diyerek kendime yüklemeyi de artık mantıklı bulmuyorum. Bazen açık anlatamıyorum çünkü düşünce henüz açık değil. Bazı süreçlerin doğası bu: düşüncenin zaman içinde açığa çıkması, belirsizliğin bir anda değil adım adım, ileri geri giderek çözülmesi. Ben zaten düşüncemi geliştirmek için oradayım. Her şeyi baştan netleştirmemi bekliyorsan, birlikte yapmamız gereken kısmı bana tek başıma yaptırıyorsun!

İyi bir düşünme ortağından beklentim de bu. Her söylediğimi hemen bir plana çevirmesin, direkt reddetmesin, direkt bir rubric karşısında sınamasın. Bir de sürekli “you're absolutely right” diye beni onaylamasına (sycophancy) ihtiyacım yok! Bir fikrin yanında durabilsin, itiraz etsin, başka bir şeyle bağlantısını görsün. Gerekirse ilk soruya dönelim, gerekirse o soruyu bırakalım. Daha neyi merak ettiğimizi anlamadan işi bitirmeye çalışmayalım!

Bu yazıyı hazırlarken “insan darboğaz” fikrini düzgünce anlatmak istiyordum. Sonra AI ile konuşma biçimimin kendisine takıldım. Bana verdiği soruları cevaplamak yerine, neden o soruları cevaplamak istemediğimi açıklamaya başladım. Yazının önemli bir kısmı da bu şekilde çıktı.

Şimdi o “sapmayı” çıkarırsam anlatmak istediğimin yarısı gidiyor. Başta planladığım yazıyı daha hızlı bitirebilirdim belki, ama şu anda düşündüğüm şeyi ve *asıl niyetimi* yazmış olmazdım.

Bazen nereye gitmek istediğini konuşurken buluyorsun. Benim AI’dan beklediğim, o kısmında da yanımda olabilmesi.
