---
title: "Prompt Yetmez: Niyet Mühendisliği"
date: "2026-03-12"
description: "Niyet ile model arasındaki uzaklık sadece prompt ile mi kapanır? Uzun ve riskli süreçlerde niyeti korumak için ne yapmalıyız? Sizi tanıştırmak isterim: Niyet Mühendisliği."
tags:
  - "yapay zeka"
  - "programlama"
  - "ajanlar"
  - "prompt"
  - "intent engineering"
translationKey: "intent-engineering"
seriesId: "ai-programming"
seriesOrder: 3
---

# Prompt Yetmez

Daha önceki yazılarımda bir şeye vurgu yapmıştım eğer hatırlarsanız, yapay zeka ajanlarına "gerekli" bağlamı verdiğimiz zaman herhangi bir görevi "muhtemelen" hepimizden daha iyi yapabileceklerini söylemiştim (üzücü :c). Ancak bu "gerekli" bağlamı vermek her zaman kolay değildir. Özellikle uzun vadeli ve karmaşık görevlerde, niyeti korumak ve modelin doğru yönde ilerlemesini sağlamak için sadece prompt yeterli olmayabilir. Modeller zaten kendi ihtiyaç duydukları bilgiyi ortamdan alabilmek için araçlarını düzgünce kullanmaya çalışırlar, bunun hepimiz farkındayız, ancak yine de pek çok durumda verdiğimiz komutlar bizim "niyetimizi" tam olarak yansıtmaz, sadece "isteğimizi" yansıtır. Bunun için modeller de sadece isteğimizi yerine getirecek sonuçlar üretmeye meyillidir.

Şöyle düşünebilirsiniz, bir modele A komutu/promptunu verdiğinizde, model bunu X farklı şekilde yerine getirebilir, ama günün sonunda bu X farklı sonucu size sunsak muhtemelen bir favori tercihiniz olur, veya en azından bazı yöntemleri garanti olarak istemediğinizi söyleyebilirsiniz. Ancak model bu bilgiye nereden sahip olabilir? Model sadece A komutunu görür, ve bu komutun altında yatan niyeti göremez. O yüzden modelin ürettiği sonuçlar bazen bizim niyetimizi tam olarak yansıtmaz, sadece isteğimizi yansıtır.

Prompt mühendisliği, kabaca, isteğimizi düzgün ifade etme işi.  
Niyet mühendisliği ise başka bir problemle uğraşıyor: modelin ürettiği şeyin, daha büyük sistemin içinde doğru yere oturmasını sağlamak.

Yani mesele sadece "iyi cevap" almak değil.  
Doğru kriterlere göre iyi cevap almak.

Ve bu kriterler her zaman prompta yazılarak çözülemez.  
Bazen prompt yetmez.  
Bazen sistemin modelden bağımsız olarak bazı şeyleri zorlaması gerekir.  
Bazen de modelin nerede duracağını baştan bilmesi gerekir.

> Komut başka şeydir, niyet başka şeydir.

Niyet, her zaman kelimeler ile tek seferde ifade edilebilen bir şey değildir. *Niyet, sürecin bir parçasıdır*, ve bu sürecin her adımında niyeti korumak ve modelin doğru yönde ilerlemesini sağlamak için farklı teknikler kullanmak gerekebilir. Prompt mühendisliği bu tekniklerden sadece biridir (süreç başlangıcını iyi yönlendirmek), ancak niyet mühendisliği, sürecin *her adımında* niyeti korumak ve modelin doğru yönde ilerlemesini sağlamak için kullanılan tüm teknikleri kapsar.

## Niyet Mühendisliği Dediğim Şey

Peki bunun bağlam mühendisliğinden farkı nedir? Andrej Karpathy'nin ortaya attığı "Context Engineering" kavramı, modelin ihtiyaç duyduğu veya duyabileceği bilgiyi ortamdan alabilmesini sağlamakla ilgilidir. Burada ilişki model-görev arasında kurulur, ve modelin görevle ilgili bilgiyi ortamdan alabilmesi sağlanır. Niyet mühendisliği ise, model-insan arasında kurulan bir ilişkiyle ilgilidir, ve modelin insanın komut ile ifade ettiği niyeti anlamasını ve bu niyete göre hareket etmesini (en azından aykırı hareket etmemesini) sağlamaya çalışır.

Biri hafızaya daha yakındır.  
Diğeri yön duygusuna.

Peki pratikte niyet mühendisliği nasıl çalışır?

Aslında bunu cevaplayabilmek için önce niyet ile komutun en baştan neden aynı şeyler olamadığını anlamamız gerekiyor. Neden tek bir mega sistem promptu ile bütün kısıtları verip, kullanıcı promptu ile de isteği veremiyoruz?

Çünkü niyet, çoğu zaman baştan tam olarak bilinmez.

İnsanlar ne istediklerini sandıkları şeyi söylerler.  
Ne istemediklerini ise genelde ancak yanlış bir sonuç gördükleri zaman fark ederler.

Bu yüzden tek seferlik kusursuz bir prompt fikri biraz romantiktir.  
Problemin kendisi, prompt yazmayı bilmememiz değildir.  
Problemin kendisi, niyetin süreç içinde açığa çıkan bir şey olmasıdır.

Bir modeli baştan çok iyi yönlendirebilirsiniz.  
Ama süreç uzadıkça yeni bilgiler gelir, yeni riskler belirir, bazı tercihler kötü görünmeye başlar.  
Model ise o ana kadar gördüğü komuta sadık kalmaya çalışır.

İşte kırılma burada yaşanır:  
komuta sadakat ile niyete sadakat aynı şey değildir.

## Büyük Firmalar Bu Problemi Zaten Yaşıyordu

Aslında burada yeni bir problemden bahsetmiyoruz.  
Sadece eski bir problemi yeni bir aktörle tekrar yaşıyoruz.

Büyük teknoloji firmaları yıllardır şunu biliyordu: büyük bir codebase'i sadece iyi mühendislerle yönetemezsiniz. Eğer tek dayanağınız "insanlar doğru kararı verir" ise, bir noktadan sonra sistem dağılmaya başlar. Çünkü ölçek büyüdükçe, herkesin kafasındaki niyet birbirinden uzaklaşır. Herkes kendi görevini yapıyor gibi gözükür, ama ortaya çıkan toplam davranış yine de yanlış olabilir.

Bu yüzden büyük firmalar yazılımı sadece kod ile yönetmez. Süreç ile yönetir. Sınırlar ile yönetir. Sürtünme ile yönetir.

Code review bunun için vardır.  
CI bunun için vardır.  
Testler bunun için vardır.  
Type system, lint kuralları, code ownership, RFC süreçleri, staging ortamları, rollout stratejileri, approval mekanizmaları... bunların hiçbiri geliştiricilere hakaret olsun diye icat edilmedi. Bunlar, niyetin yol üzerinde bozulmasını engellemek için icat edildi.

Çünkü büyük bir sistemde sorun şudur: birisine "şunu yap" demek yetmez.  
Asıl soru şudur: o kişi bunu yaparken hangi şeyleri asla bozamaz?  
Nerede durmalıdır?  
Hangi değişiklikler otomatik reddedilmelidir?  
Hangi riskler insan gözü görmeden geçmemelidir?

İşte bu yüzden büyük codebase'ler prompt ile değil, protokol ile yönetilir.

Bence burada önemli olan analoji şu: bugün ajan sistemleri için yeniden keşfettiğimiz şey, büyük yazılım organizasyonlarının yıllardır bildiği bir gerçek. Niyet, sadece başta söylenen bir cümle değildir. Niyet, sürecin içine gömülmesi gereken bir şeydir. Eğer gömmezseniz, sistem ilk bakışta doğru çalışıyor gibi görünür ama zamanla yanlış şeyi optimize etmeye başlar.

Model de biraz böyledir.  
Ona başta çok güzel bir prompt verebilirsiniz.  
Ama uzun bir görevde, çok dosyalı bir sistemde, riskli bir operasyonda, tek seferlik komut yeterli olmaz. Çünkü modelin önünde sürekli lokal kararlar vardır. Hangi dosyayı okuyayım, neyi varsayayım, neyi değiştireyim, neyi atlayayım, ne zaman durayım? Eğer bu kararların etrafında niyeti koruyan bir sistem yoksa, model çoğu zaman kötü niyetli olduğu için değil, fazla itaatkar olduğu için yanlış yöne gider.

Yani sorun sadece modelin zeki olup olmaması değildir.  
Sorun, zekanın hangi rayların üstünde hareket ettiğidir.

## Programlama Hep Niyet Mühendisliğiydi

Aslında burada tamamen yeni bir şeyden bahsetmiyoruz.

Programlama tarihi biraz da şunun tarihidir:  
insanın kafasındaki niyet, makinenin çalıştırabileceği forma nasıl çevrilir?

Assembly bunun ilkel halidir.  
C biraz daha insani bir katmandır.  
Framework'ler tekrar eden niyetleri paketler.  
API'ler sınır çizer.  
Type system bazı hatalı niyet ifadelerini daha en baştan reddeder.  
Testler, "benim kastım buydu"yu sonradan doğrular.  
Code review ise niyetin sadece makineye değil, başka insanlara da bozulmadan aktarılıp aktarılmadığını kontrol eder.

Yani programlama dediğimiz şey hiçbir zaman sadece komut yazmak değildi.  
Her zaman, niyeti daha güvenilir bir şekilde ifade etme çabasıydı.

Bu açıdan bakınca prompt da çok yabancı bir şey değil.  
Sadece aynı problemin daha çıplak, daha savunmasız bir yüzü.

## AI Bunu Neden Çıplaklaştırdı

Çünkü klasik yazılım sistemleri sizden kesinlik isterdi.

Derleyici belirsizliği sevmez.  
Type checker niyetinizi tahmin etmeye çalışmaz.  
Testler, çalışmayan bir şeyi nazikçe "yaklaşık olarak doğru" ilan etmez.

LLM ise farklıdır.  
Sizden tam spesifikasyon değil, yön duygusu da ister.  
Boşlukları doldurur. Varsayar. Yorumlar. Tam da bu yüzden güçlüdür.

Ve tam da bu yüzden tehlikelidir.

Çünkü insanın en zayıf olduğu yer burasıdır:  
ne istediğini bildiğini sanır, ama çoğu zaman ancak yanlış sonucu görünce gerçekten ne istediğini anlar.

Klasik yazılımda bu zayıflık daha erken duvara çarpıyordu.  
LLM'lerde ise bir süre çalışıyormuş gibi görünebilir.

Bu yüzden prompt yetmez.

Sorun prompt yazmayı bilmememiz değil.  
Sorun, niyetin tek seferde eksiksiz söylenebilen bir şey olmaması.

## Beklenmedik Sonuç: Programlama Neden Ölmeyecek

Belki de "prompt engineering" ismi en baştan biraz eksikti.

Çünkü mesele modele güzel cümleler kurmak değil.  
Mesele, niyeti süreç boyunca kaybetmeyecek bir sistem kurmak.

Prompt bunun bir parçası.  
Ama sadece bir parçası.

Programlama dilleri, tip sistemleri, testler, review süreçleri nasıl tek başına yeterli olmadıysa, prompt da yetmeyecek.

Çünkü komut başka şeydir, niyet başka şeydir.

Ve yazılımın tarihi boyunca asıl zor problem hep aynıydı:  
insanın ne demek istediği ile sistemin ne yaptığı arasındaki mesafe.

Bu mesafe her geçen gün kısalıyor gibi, ama hâlâ tartıştığımıza göre, sizce gerçekten sıfıra gidebilir mi?

"Bir gün biri gelecek, hiçbir şey demeyecek, ağaç zaten bilecek" gerçekten mümkün mü?

Yoksa her zaman bir miktar niyet mühendisliği olacak mı?
