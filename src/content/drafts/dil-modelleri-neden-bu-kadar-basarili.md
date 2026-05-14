---
title: "Dil Modelleri Neden Bu Kadar Başarılı?"
date: "2026-02-04"
description: "Dil modelleri mucizevi gibi gözüken bir başarım oranına sahip. Nasıl oluyor da sadece matrix-vektör çarpımı olan bu modeller bu inanılmaz başarımı else edebiliyor? Dil ile alakalı bir şeyler özel mi? Olay üretken yapay zeka mı? Her şey cidden 'ölçekleme' ile açıklanabilir mi?"
tags:
  [
    "dil modelleri",
    "yapay zeka",
    "üretken yapay zeka",
    "doğal dil",
    "gerçeklik",
    "ölçekleme",
  ]
translationKey: "dil-modelleri-neden-bu-kadar-basarili"
series: "Üretken Yapay Zeka"
seriesOrder: 1
---

KENDIME NOTLAR:

- öncelikle gerçekliğin tek olduğunu okuyucu kafasında oturtmalı, modaliteden bağımsız olarak modelleri genel bir zekaya yaklaştırdığımız zaman tek bir gerçekliğe yakınsarlar embedding uzaylarında. Burada şu makaleye atıf yap: The Platonic Representation Hypothesis (https://arxiv.org/abs/2405.07987)
- İkinci olarak "zekaya yaklaştırma" derken neyi kast ettiğimiz netleşmeli. 4 temel zeka tanımı olduğundan bahsedilmeli: insan gibi düşünmek, insan gibi davranmak, rasyonel düşünmek, rasyonel davranmak.
- Dilin gerçekliğin hali hazırda kompakt bir gösterimi olduğu belirtilmeli. Görsel ile kıyaslama yapılabilir. Bu nokta çok çok kritik.
- Modellerin ölçekleme ile (insan gibi davranma objektifi üzerinden) ancak bu kompakt gösterime yakınsayabildiği belirtilmeli. (Mucize cam gibi kırılır bu gerçek idrak edildiği zaman.)
- Bu gösterimi içselleştirse bile (ki içselleştirmeyip sadece ezberleme riski de var), hâlâ zeki olmadığı belirtilmeli. Gerçekliği kompakt bir istatistiksel gösterime indirgemek insanı taklit etmektir, ama arbitrary rasyonel objektifler için (bir başka zeka tanımı baz alındığı zaman) insanı taklit etmek zeki olmak demek değildir. Halüsinasyon probleminden bahsedilmeli.
- Büyük dil modelinden büyük düşünce modeli elde etmede nasıl rasyonel davranma objektifi üzerinden çalıştığımız belirtilmeli.
  note: düşünme tanımı (insan gibi düşünmek ve rasyonel düşünmek) üzerinden ilerlemediğimize atıf yapabilirsin. İlginç bir gerçek çünkü. Biyolojiden alınan ilhamlar ve mantıktan alınan ilhamlar davranışsal bakış açısı ile yapılan yatırımların ve elde edilen getirilerin yanında komik kalıyor.
- Hala var olan eksikliklere atıf yapılmalı. Kalıcı hafızayı modellemek tahmin ettiğimizin ötesinde bir zorluk olabilir, objektif iyi tanımlı değil.

# Dil Modelleri Neden Bu Kadar Başarılı?

Sadece matris çarpımı olan bir şey nasıl bu kadar başarılı? Gerçekten artık kanıksamış durumdayız ama düşündüğünüz zaman gerçekten mucizevi bir durum.
Birkaç on GB'lık bir matrisden oluşan sistemler, pek çok alanda insanla yarışabilecek düzeydeler! Sadece matematiksel ifadeler, nasıl bizim tanımladığımız alanarda bile bu kadar başarılı olabiliyor. Nasıl bir yapıya sahipler ki, bu başarımları sadece oyun yapay zekalarındaki gibi bir alanla kısıtlı kalmayıp, pek çok alanda insanla yarışabilecek düzeyde olabiliyor? Ve yine, nasıl oluyor da sadece matris çarpımı olan bu şey, sadece pek çok metrik üzerinden bizlere yetişmekl / bizleri geçmekle kalmayıp, bunları bir de ifade edebiliyor?

Sanki gerçekten de bir ruhları var gibi değil mi? Mucizevi bir şekilde sanki cidden içinde insan var gibi davranıyorlar. Tabii ki gerçek bundan çok farklı.

Ve gerçeği öğrendiğiniz zaman, maalesef o kadar şaşırmayacaksınız :)

Bahsettiğim bu gerçeği anlamak için sizinle bir yolculuğa çıkacağız. Bu yolculuğumuz şu durakları kapsacak:

- Gerçeklik
- Zeka
- Dil
- Ölçekleme
- Ajan Yaklaşımı
- Sonuç

Haydi başlayalım o zaman.

## Tek Bir Gerçeklik

Şöyle bir şey düşünün: bir yapay zeka modeli var, sadece metinlerle eğitilmiş. Bir başka model var, sadece görsellerle eğitilmiş. Tamamen farklı veriler, tamamen farklı modaliteler. Bu iki modelin iç dünyaları birbirinden çok farklı olmalı, değil mi?

Değil. Yeterince büyük ve yeterince iyi eğitilmiş modellerin iç gösterimleri birbirine yakınsıyor [ext:https://arxiv.org/abs/2405.07987 "The Platonic Representation Hypothesis"]. Yani metin üzerinden "kedi" kavramını öğrenen bir model ile görsel üzerinden "kedi" kavramını öğrenen bir model, iç dünyalarında benzer bir gösterime ulaşıyor. Farklı pencerelerden bakıyorlar ama aynı şeyi görüyorlar!

Bu tesadüf olamaz. Neden oluyor peki?

Çünkü **dışarıda tek bir gerçeklik var.** Bir kedinin dört bacağı var, tüylü, miyavlıyor — bunu ister metinden öğren ister görselden, yakınsadığın şey aynı. Gerçeklik bir tane olduğu için, onu yeterince iyi modellemeye çalışan her sistem kaçınılmaz olarak benzer bir iç gösterime ulaşıyor.

Bu size çok trivial gelebilir, çünkü siz zaten gerçekliğin içinde yaşıyorsunuz. Ama dışarıdan bir "sanal ruhu" bu gerçekliğin içine sokmaya çalıştığınız zaman, gerçekliğin bir tane olması gerçekten çok önemli bir şey. Çünkü dışarıdaki X tane zeka gerektiren işi yapabilecek bir sistemin, aslında sadece bir tane modellemeye ihtiyacı var! Çeviri, tıbbi teşhis, kod yazma, hukuki analiz... hepsinin altında aynı gerçeklik yatıyor. Yapay zeka modellerinin embedding uzaylarının sadece ve sadece gerçeklik ile örtüşmesi yeterli yani! (bu kadar sevindik ama o kadar da kolay değil bu :d)

Bu örtüşmeyi tam sağlayamadığın zaman ne oluyor peki? Kısıtlı yapay zeka oluyor. Mesela satranç yapay zekası gibi. İç gösterimi sadece satranç taşlarını, hamleleri, pozisyonları modelleyebilen, bunun dışında dünyadan haberi olmayan dar bir sistem. İyi satranç oynar, ama başka hiçbir şey yapamaz. Gerçekliğin tamamını değil, sadece bir dilimini modelliyor çünkü.

Peki "gerçeklikle örtüşmek" derken neyi kast ediyoruz?

Kastettiğim şey aslında yapay zekanın iç dünyasının dışarısı ile uyumlu olması. Modelin genel olarak bütün kavramlar arası ilişkileri modelleyebilmesi. Mesela kadın kavramı ile erkek kavramı arasındaki ilişkiyi bilmesi lazım ki, kral kavramı ile kraliçe kavramı arasındaki ilişkiyi de modelleyebilsin.

İlginç olan şey bunun hali hazırda var olması, ve gözlemleyebilmemiz! Verdiğim örnek bile rastgele bir örnek değil, denenmiş bir örnek. Gerçekten de yapay zeka modeline kadın + kral - erkek hesabı yaptırdığınız zaman, uzayındaki gösterim modelin "kraliçe" gösterimine çok yakınsıyor! Eğer siz de denemek isterseniz kendi web sitemden modellerin gerçekten dış dünyayı modelleyebildiğine tanık olabilirsiniz: [ext:https://rusen.ai/nerdy-stuff/embedding-explorer "Embedding Explorer - Rusen AI"].

Güzel, bu kısımda şunları anlamış olduk yani:

- Farklı modalitelerde eğitilen modeller, yeterince büyüdüklerinde benzer iç gösterimlere yakınsıyor. Çünkü dışarıda tek bir gerçeklik var.
- Genel bir yapay zeka sistemi elde edebilmek için bu gerçekliği modelin iç gösterimine eşlemek gerekiyor.
- Öteki türlü model ile sadece gerçekliğin bir kısmını modelleyebiliyoruz (mesela satranç oynayan yapay zekanın iç gösterimi sadece satranç taşlarını modelleyebiliyor, diğer şeyleri modelleyemiyor).

Haydi devam edelim.

## Zekanın Kısa Bir Tanımı

Peki, modelimiz gerçekliği bir veya başka bir şekilde gösterimlese bile, onunla nasıl etkileşime geçecek? Bu da işin "zekayı modelleme" kısmından geliyor. Ve zekanın ne olduğu ile alakalı bilgiye ihtiyacımız var. Literatüre hakim olanları bir tık sinir edebilirim, ama zekanın ne olduğu ile alakalı genel olarak 2 farklı yaklaşım var:

- Davranışsal Yaklaşım: Zeka, bir varlığın dış dünyayla etkileşiminde gösterdiği davranışın kısıtlamaları ile tanımlanır.
- Sistemsel Yaklaşım: Zeka, bir varlığın iç işleyişinin kısıtlamaları ile tanımlanır.

ve nasıl olduğu ile alakalı da iki farklı yaklaşım var:

- Rasyonel Yaklaşım: Zeka rasyonel objektifleri yapabilmeli.
- İnsancı Yaklaşım: Zeka insana benzemeli.

bu "ne" ve "nasıl" yaklaşımlarını düzleme oturttuğumuz zaman 4 farklı zeka tanımını elde ediyoruz:

- Davranışsal - Rasyonel: Rasyonel davranan sistem.
- Davranışsal - İnsancı: İnsan benzeri davranan sistem.
- Sistemsel - Rasyonel: Rasyonel işleyen sistem.
- Sistemsel - İnsancı: İnsan benzeri işleyen sistem.

## Dili Özel Yapan Şey

## Ölçeklemenin Getirdikleri ve Getiremedikleri

## Düşünce Modelleri / Ajan Yaklaşımı

## Neredeyiz?
