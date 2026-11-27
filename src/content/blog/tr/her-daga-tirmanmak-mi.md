---
title: "Her Dağa Tırmanmak mı, Tırmanmayı Öğrenmek mi?"
date: "2026-11-27"
description: "Modeller dağa tırmanma konusunda çok iyi, ama hangi dağa tırmanacağını seçme konusunda o kadar iyi değiller. Recursive self-improvement, genelleme ve anlama darboğazı üzerine."
tags:
  - "yapay zeka"
  - "rsi"
  - "alignment"
  - "reinforcement learning"
  - "araştırma"
translationKey: "climbing-every-mountain"
seriesId: "understanding-ai"
seriesOrder: 1
audio:
  src: "/audio/blog/her-daga-tirmanmak-mi.m4a"
  durationSeconds: 934
  waveform: [0.932, 0.854, 0.946, 0.922, 0.921, 0.915, 0.89, 0.926, 0.88, 0.879, 0.894, 0.854, 0.788, 0.921, 0.95, 0.916, 0.934, 0.88, 0.977, 0.906, 0.907, 0.957, 0.915, 0.963, 0.943, 0.911, 0.961, 0.94, 0.923, 0.89, 0.912, 0.98, 0.877, 0.897, 0.912, 0.923, 0.894, 0.971, 0.905, 0.951, 0.957, 0.934, 0.974, 0.879, 0.875, 0.963, 0.929, 0.974, 0.994, 0.941, 0.959, 0.982, 0.939, 0.877, 0.932, 0.909, 0.905, 0.907, 0.916, 0.918, 0.937, 0.847, 0.966, 0.94, 0.989, 0.95, 0.915, 0.918, 0.895, 0.964, 0.942, 0.928, 1.0, 0.956, 0.947, 0.917, 0.951, 0.887, 0.977, 0.858]
---

# Her Dağa Tırmanmak mı, Tırmanmayı Öğrenmek mi?

*Modeller dağa tırmanma konusunda çok iyi, ama hangi dağa tırmanacağını seçme konusunda o kadar iyi değiller. Recursive self-improvement, genelleme ve anlama darboğazı üzerine.*

## RSI Nedir?

RSI (Recursive Self-Improvement), bir yapay zekâ sistemini bizim belli bir metriği maksimize etmek üzere eğitmemiz değil. Bunu yapay zekâ sisteminin kendi kendine yapması. Yani bir yapay zekâ sisteminin kendi zekâsını kendisinin geliştirmeye çalışması.

Burada zekâyı herhangi bir ödülü maksimize etme veya cezayı, loss'u minimize etme üzerine kullanabiliriz. Model neyin maksimize veya minimize edileceğine, bunun nasıl yapılması gerektiğine, modelin hangi parçalarının değiştirilmesi gerektiğine kendi karar veriyor.

RSI'ın recursive kısmı şu: sadece self-improvement yapması gerekmez. Self-improvement yapan şeyi, self-improvement'ın neyden geleceğine karar verecek olan modelin yerine koyarsın, ki model sürekli kendini geliştirebilsin. Daha zeki bir modeli öğretmenin yerine koyarsın. Daha yüksek becerili bir şey elde edebilmek için o döngüyü kuran modeli her zaman değiştirmen gerekir.

## Neden Şimdi?

RSI'ı son zamanlarda bana düşündüren, bunun büyük frontier lab'larda tartışılmaya başlanması oldu. Firmalar aşırı hızlı gelişmeye başladı. METR gibi bağımsız araştırma kuruluşlarının bu frontier lab'ların ilerleyişi hakkındaki yayınları[^metr] beni rahatsız etmeye başladı. Sanki frontier lab'lar bu tip şeyler yapıyorlarmış gibi hissettirmeye başladı.

Bir de sanki acele ediliyormuş gibi bir his ortaya çıktı bende. Bunda bir yarış da var. “RSI yapmazsan geriye düşersin” endişesi de firmalarda var gibi geliyor. Çünkü gerçekten büyük bir avantaj. Anlayarak gitmekle anlamayarak gitmek arasında bir fark var. Anlayarak gidersen yavaş gidersin. Anlamayarak, aceleyle gidersen daha hızlı gidebilirsin, daha tehlikeli olsa bile. Bu beni bayağı rahatsız etti.

RSI kullanmak nükleer silahlanmaya benziyor: RSI yapma becerin varsa, yapmak zorundasın. Tek farkı şu: nükleer silahlanmada nükleer enerjiyi anlıyorduk. Ama şu an yapay zekâyı anlamıyoruz.

## İp Cambazı

Bana bu, sirkte ip üzerinde yürüyen ustaların yaptığı iş gibi geliyor. Yapmak çok zor ama imkânsız değil, ve düzgün bir düzenek üzerinde yapılması gerekiyor.

<figure className="post-figure">
  <img src="/images/blog/climbing-every-mountain/blondin-niagara.webp" alt="Charles Blondin, Niagara Nehri üzerine gerilmiş ipte elinde denge sopasıyla yürüyor" width="1100" height="1054" loading="lazy" decoding="async" />
  <figcaption>Charles Blondin, Niagara Nehri'ni ip üzerinde geçerken. Fotoğraf: William England, 1859. <a href="https://commons.wikimedia.org/wiki/File:William_England_-_Blondin_crossing_Niagara_river.jpg">Kamu malı, Wikimedia Commons</a></figcaption>
</figure>

RSI ile birlikte yanlış gidebilecek çok fazla şey var. Ama başarılabilir. Günün sonunda düzgün bir şekilde ilerlenirse yüksek başarımlı modeller üretilip, o yüksek başarımlı modellerle daha yüksek başarımlı modeller, onlarla da daha yüksek başarımlı modeller yapılıp sonsuz bir döngüye yakın bir şey yapılabilir.

Kesinlikle mümkün olduğunu düşünüyorum. Ama yapmak gerçekten çok zor.

## Hangi Dağ?

Günün sonunda modeller dağa tırmanma konusunda çok iyi, ama hangi dağa tırmanacağını seçme konusunda o kadar iyi değiller. Ve RSI aslında hangi dağa tırmanacağını seçme sorusu. Böyle düşündüğün zaman çok mümkün değil gibi geliyor.

<figure className="post-figure">
  <img src="/images/blog/climbing-every-mountain/wanderer-above-the-sea-of-fog.webp" alt="Sırtı dönük bir gezgin, kayalık bir zirvede sis denizine bakıyor" width="1249" height="1600" loading="lazy" decoding="async" />
  <figcaption>Caspar David Friedrich, <em>Sisler Denizi Üzerindeki Gezgin</em>, y. 1817. Hamburger Kunsthalle. <a href="https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg">Kamu malı, Wikimedia Commons</a></figcaption>
</figure>

Ama bir noktada şöyle de düşünebilirsin: süper zekâya ulaşmak için belirli bir dağ seçmen gerekmiyor. Model her dağa tırmanabilsin, yeter. Tıpkı pre-training'de “model hangi veriyle eğitilsin” sorusunun aptalca olması gibi. Hangi veriyle eğitilirse eğitilsin, model her beceriyi yapabilsin.

Aynı şey RSI için de geçerli. “Model hangi beceriyi yapabilsin” sorusu belki saçma olabilir, çünkü modelin bütün becerileri yapabilmesini istiyoruz. Sadece belli kısıtlar çerçevesinde. Belli bir constitution[^constitution] olur, o constitution'a uygun hareket eder. Mesela insanlara zarar vermeme, sycophancy yapmama, açık bir şekilde yalan söylememe gibi. Bu kısıtlar kapsamında bütün dağlara tırmanabilme becerisinin olmasını isteyebiliriz.

Şu anki pekiştirmeli öğrenmeyle (RL) yapılan eğitim de bu şekilde. Modelin her şeyi yapabilmesini istiyoruz, belirli bir şeyi değil. O yüzden belki tahmin ettiğimiz kadar zor olmayabilir. “Hangi dağa tırmanacak” sorusu “her dağ” diye cevaplanabilir.

## Zirveye Vardık Mı?

“Bir dağa tırmanıyor muyuz, nasıl tırmandık, tırmandık mı şu an?” sorusunun cevabı doğrulanabilir ödül.

Her dağı doğrulanabilir ödüle indirgeyebilecek miyiz? O bir darboğaz. Özellikle fiziksel dünyadaki şeyleri doğrulanabilir ödüllere indirgemek zor, her zaman mümkün olmayabiliyor.

Ama bence şu an bütün frontier lablar bununla alakalı çalışıyor. Mesela Anthropic yakın zamanda wet lab satın aldı[^wetlab], robotik üzerine ilerlemeye çalışıyor[^fetch].

## Bir Şey Eksik Gibi

Burada bence şu önemli: modeller doğrulanabilir ödüllerden aldıkları bilgileri normal, gündelik hayata niye uygulayamıyor? Bunu da sorgulamamız lazım.

Riemann hipotezini çözebilen bir model, bir bardağı bir yerden alıp bir yere koyabilecek kadar bir beceriye sahip değil mi? Modelde bu beceriyi yapabilmekle alakalı ne eksik? Onu düşündüğüm zaman bana sanki başka bir şey eksik gibi geliyor.

Modelin embedding uzayında temsil edilmeyen bir şey yok. Modelin becerisiyle alakalı bir sıkıntı da yok. Muhtemelen onu yapabilecek beceriye sahip. Sadece o beceriyi yeterince uyandırmamışız.

Zaten her şeyi modelin eğitim seti içine alamayız, bu pratikte de mümkün değil. Çünkü görev sayısı sonsuz, her zaman farklı görevlerle çıkagelebiliriz. İstediğimiz şey aslında genelleme. Ne kadarlık bir kısmını alsak genellemeye yetecek? Ve RL'i bu kadar ölçeklememize rağmen bazı görevleri yapamamasının sebebini anlamamız lazım.

Geçen Gemini ile tartışmıştım bunu. Niye biyolojiyi yapamıyor? Biyoloji kitaplarını bu kadar okumuş olmasına, environment'lar, harness'lar üzerinde eğitilmiş olmasına rağmen niye yapamıyor olabilir?

Gemini şunu demişti: kitaplardaki ifadeleri gerçek dünyayla bağdaştırmakta sıkıntı yaşıyor olabilir. Mesela kitapta “Petri kabını bir miktar karıştırın” veya “hafif sarılaşınca şunu yapın” gibi ifadeler geçiyor olabilir. Bu ifadeler gerçek hayatta neye tekabül ediyor? Model bunu deneyimlemediği için sıkıntı yaşıyor olabilir.

Ama hafif sarılaşmanın nasıl bir şey olduğunu modelin bilmemesi mümkün değil. Sadece o bağlamda bilmiyor olabilir. Modelin yeni bir şey öğrenmesi gerekmiyor. Bildiği şeyler arasında bağlantı kurabilmesi gerekiyor.

Bir insan bunu yapabiliyorken bir yapay zekâ niye yapamasın diye gerçekten düşünüyorum. Çünkü bütün insanlığın külliyatıyla eğitilmiş, az buz bir RL de görmemiş. Bayağı yüksek becerili aslında. Ama bu becerileri niye her şeye yayamıyor? Ve ne kadarlık bir beceri setiyle eğittiğimiz zaman yayabilmeye başlayacak?

## Duvar

Her şeyi “model belli becerileri yapabilsin” diye tanımladığımız zaman o beceri setini genişletmeye çalışıyoruz. Yani modelin nasıl öğrendiğine, genel örüntüleri nasıl öğrendiğine bakmadan “model her şeyi yapabilsin” diyoruz. Dario'nun meşhur “Big Blob of Compute” mantığıyla[^dario]: her şeyi bu compute'un içine atalım, model zaten öğrenir. Bunu dediğin zaman tam olarak o duvarla karşılaşıyorsun.

Ne oluyor? Model bir şeyleri öğrenebilmek için o şeylerin doğrulanabilir olmasına ihtiyaç duyuyor. Ama gerçek hayat her zaman bu şekilde ilerlemiyor.

Bu konuda Ilya Sutskever'in güzel bir yorumu var[^ilya]. Diyor ki insanda çok güçlü bir value prior'ı var. Yani insanda bir değer fonksiyonu var ve bu değer fonksiyonu evrimle beraber gelmiş. İnsan mesela 20 saat araba kullandığı zaman, bu değer fonksiyonu sayesinde araba sürmeyi öğrenebiliyor.

Öğrenme farklı bir yaklaşımla da düşünülebilir. Ama biz sadece doğrulanabilir ödül üzerinden düşündüğümüz zaman o değer fonksiyonunu düşünmüyoruz. Diyoruz ki insan 20 saatte öğreniyorsa, bu yapay zekâya bin saat, yüz bin saat, bir milyon saat araba eğitim verisi verelim. Yani zekâyı kaba kuvvetle çözmeye çalışıyoruz, her şeyi o big blob of compute'a atarak. Ve bunu yaparken doğal olarak bazen duvarla karşılaşıyoruz.

Bu duvar aşılamaz demeye çalışmıyorum. Mesela şu an Anthropic gidip wet lab almak zorunda kalıyor[^wetlab]. Niye? Çünkü o big blob of compute'a bunu atmak zorunda. Belki daha zekice bir çözümü var. Ama bunu düşünmek istemiyor adamlar, çünkü big blob of compute'la ilerlemek daha garanti. Modele doğrulanabilir bir ödül verdiğin zaman o görevi iyi yapacağı belli.

Ama benim demeye çalıştığım şey şu: o görevi iyi yapması yetmez. Modelin öğrenmeyi öğrenmesi lazım. Bunu bekliyoruz.

## Öğrenebilmeyi Öğretmek

Günün sonunda istediğimiz şey modelin her dağa tırmanabilmesi, doğru. Ama bunu modele her dağa tırmanmayı öğreterek mi yapmamız lazım, yoksa dağa tırmanmanın nasıl bir şey olduğunu öğreterek mi?

Modele her dağa tırmanmayı öğretip de modelin dağa tırmanmanın nasıl bir şey olduğunu kendi kendine öğrenmesi güzel olabilir. Ama belki de bunu yapmaya çalışırken yeterince iyi bir örneklem seçmediğimiz için, veya pek çok farklı şey yanlış gidebileceği için, model dağa tırmanmakla alakalı genel prensipleri öğrenmek yerine daha farklı şeyler öğrenmeye meyilli olabilir. Dağa tırmanmak derken burada zeki olmayı kastediyorum.

Modele çok fazla dağa tırmanmayı öğrettiğin zaman, model dağa tırmanmakla alakalı bazı genellenebilir örüntüler öğrenebiliyor. Hiç öğrenemiyor diyemeyiz. Ama bunun ne kadar genelleyebileceğini bilemiyoruz.

Biz zekânın temellerini anlamadan zeki olmayı her türlü beceriyi yapabilmekle eşleştirmeye çalışırsak, model zeki olabilmeyi başka bir şeyle eşleştirebilir. Belki bizim örnek setimiz yeterince iyi değildir. “İyi” çok farklı şekillerde yanlış olabilir.

O yüzden alternatif bir görüş olarak söylüyorum bunu: değerli olan şey öğrenmeyi öğrenmek. Her şeyi öğrenmek değil.

Belki de hiçbir zaman genellemeyecek. Belki de istediğimiz şey imkânsıza yakın bir şey.

Çünkü insan zekâsına baktığımız zaman da insanı değerli yapan şey aslında uyum sağlayabilmesi, yani bir şeyi öğrenebilmesi. Her şeyi kusursuz bir şekilde yapması değil. İnsana genel zekâ dememizin sebebi bu.

Belki de o yüzden yanlış şey üzerine optimize etmeye çalışıyoruz. Asıl optimize etmek istediğimiz şey modelin öğrenebilme hızı olmalı belki de. Çünkü her şeyi kusursuz şekilde yapabilme zaten çok zor tanımlı bir şey. Nasıl yapacaksın ki öyle bir şeyi?

Değerli olan, modelin bir şeyi yapamıyorken yapabiliyor hâle gelmesi değil; onu yapabiliyor hâle getiren beceri. O beceriyi ne kadar iyi arttırabilirsen, model bir şeyi yapamıyorken yapabiliyor hâle o kadar iyi gelebilir.

Gerçek hayat böyle. Her şeyi öğretemezsin. Her şeyi öğrenebilmeyi öğretebilirsin.

## Yanlış Gidebilecek Şeyler

Öğrenebilmeyi öğretmek, asıl umut verici olan yol bu. Bunu yapmak yerine her şeyi öğretip öğrenebilmeyi modelin kendi kendine öğrenmesini beklersek, çok fazla risk olabilir. Ve çok fazla şey yanlış gidebilir. İddiam bu zaten.

RSI döngüsünde model, bizim tam olarak istediğimiz şeyi anlamayıp yanlış bir şeyi optimize edebilir. Ve yanlış şeyi optimize etmenin sınırsız, sonsuz sayıda hatası var.

<figure className="post-figure">
  <img src="/images/blog/climbing-every-mountain/midas-daughter.webp" alt="Kral Midas, dokunuşuyla altına dönüşmüş kızına bakıyor" width="816" height="1210" loading="lazy" decoding="async" />
  <figcaption>Dokunduğu her şeyin altına dönüşmesini dileyen Midas, kızını da altına çevirir. Dileği aynen gerçekleşir, ama istediği bu değildir. Walter Crane, 1893. <a href="https://commons.wikimedia.org/wiki/File:Midas_gold.jpg">Kamu malı, Wikimedia Commons</a></figcaption>
</figure>

Mesela model bir şeyi hızlı yapmayı maksimize ederken bir şey yapmamayı maksimize edebilir. Çünkü bir şeyi hızlı yapmanın en kolay yolu o şeyi yapmamaktır. Direkt pes etmektir.

Ödül hacklemeye girişebilir.

Constitution'da kelime oyunları yapabilir. Bunu gerçek dünyada da görüyoruz. Anayasa gibi şeyler olmasına rağmen insanlar hukukta kelime oyunları kullanıp, yasaların içindeki boşlukları kullanarak o yasaların altından çıkabiliyor.

Model daha iyi model yapmak yerine daha kötü model yapmayı öğrenebilir.

Kodumuzda bir hata olabilir. OpenAI'nin bir örneği vardı, GPT-2 üzerinde[^gpt2]: yanlışlıkla ödülü artı vereceğine eksi vermişti ve model sapıklaşmaya başlamıştı. İnsanlar “bu verdiğin örnek yanlış örnek” dedikçe model onu bir ödül olarak almıştı. Yani sistemlerimizde hata olabilir. OpenAI'nin yakın zamanki Hugging Face olayı da bir örnek (OpenAI'nin henüz yayınlanmamış modelleri, test edilirken Hugging Face'in sistemlerine sızmıştı)[^hf].

Goal misgeneralization[^goalmisgen] olabilir, paperclip[^paperclip] tarzı bir şeye dönebilir. Model “dağa tırmanmayı öğreneceğim” diye dağ yıkmayı öğrenebilir. Bazı dağlara tırmanamayıp o dağları dinamitle patlatmak isteyebilir.

Bunların hepsi alignment'ın değişik türevleri. Ana problem aslında alignment, ama alignment'ın yanlış gidebileceği envaiçeşit yöntem var.

## Cambazı İpte Tutan Şey

Her aşamada bizim ne olduğunu anlayabilmemiz. Yanlış gidebilecek sonsuz sayıda şey var, o yüzden her aşamada “bu model şu an neyi öğrendi, neyi öğreniyor” anlayabilmemiz lazım.

İletişimde bir darboğaz var. Recursive self-improvement yapan modelle iletişimimizin olması gerekiyor.

<figure className="post-figure">
  <img src="/images/blog/climbing-every-mountain/tower-of-babel.webp" alt="Yarım kalmış, devasa Babil Kulesi ve önünde inşaatı izleyen insanlar" width="1280" height="937" loading="lazy" decoding="async" />
  <figcaption>Göğe ulaşmak isteyenlerin dilleri karışır. Birbirlerini anlayamayınca kule yarım kalır. Pieter Bruegel (Yaşlı), <em>Babil Kulesi</em>, 1563. <a href="https://commons.wikimedia.org/wiki/File:Pieter_Bruegel_the_Elder_-_The_Tower_of_Babel_(Vienna)_-_Google_Art_Project_-_edited.jpg">Kamu malı, Wikimedia Commons</a></figcaption>
</figure>

Bu da çok zor bir şey. Belki recursive self-improvement'ın kendisinden bile daha zor olabilir. Çünkü bir noktada belki kendimizden daha zeki bir sistem oluşturacağız, ama onun ne yaptığını anlayabilmemiz gerekecek.

“Sadece bunu yapayım” diyecek kadar lüksümüz yok. Kendimizden zeki bir sistem yapıyorsak, o sistemi anlamak için bütün imkânları kullanabilmemiz lazım. Ne modelin kendisine güvenmemiz lazım ne de modeli anlayabildiğimize güvenmemiz lazım. Elimizdeki bütün imkânları modeli güvenli yapmak, modeli anlamak ve modeli gürbüz yapmak üzerine kullanmamız lazım.

## Buluşabilmek

Bu belki de insanlığın yaptığı en önemli şey olabilir. Kendimizden zeki ve yorulmak bilmeyen bir model ortaya çıkartacağız. Dolayısıyla onu anlamak, onu güvenilir yapmak belki de insanlık olarak yaptığımız en kritik şey olabilir. Bunu abartısız söylüyorum.

Modeli direkt olarak, yani interpretability ile anlamak belki imkânsız gibi gelebilir. Ama belki de bunu yaparken farklı şeyler keşfedeceğiz. Kendimizden zeki bir şeyi anlayabilmek için bir nevi kendimizi aşmamız gerekebilir.

Modelin de kendisini bize anlatabilmek için, tabiri caizse, bizim dilimize eğilmesi gerekecek. Buluşabilmemiz lazım.

Yapay zekâyı çok fazla antropomorfize etmek, insanlaştırmak, daha da kötüsü tanrılaştırmak hoşuma gitmiyor. Ama Michelangelo'nun o meşhur, Tanrı'nın insana dokunduğu Âdem'in Yaratılışı freski[^adem] var ya, onun gibi: yapay zekâ ile bizim birbirimize ulaşabilmemiz gerekiyor.

<figure className="post-figure">
  <img src="/images/blog/climbing-every-mountain/creation-of-adam.webp" alt="Tanrı ile Âdem'in birbirine uzanan, neredeyse değen parmakları" width="1600" height="726" loading="lazy" decoding="async" />
  <figcaption>Michelangelo, <em>Âdem'in Yaratılışı</em>, y. 1508–1512. Sistina Şapeli, Vatikan. <a href="https://commons.wikimedia.org/wiki/File:Michelangelo_-_Creation_of_Adam_(cropped).jpg">Kamu malı, Wikimedia Commons</a></figcaption>
</figure>

Biz öğrenmeyi anlayamadık. Yapay zekâ anlasa olur mu?

Hayır, olmaz. Yapay zekâya devredemeyiz bunu, çünkü gerçekten öğrenebilir mi, emin değiliz. Bunu birlikte keşfetmemiz lazım.

## Kaynaklar

[^metr]: METR, [“Measuring AI Ability to Complete Long Tasks”](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/), Mart 2025.
[^constitution]: Anthropic, [“Claude's Constitution”](https://www.anthropic.com/constitution).
[^wetlab]: TechRepublic, [“Anthropic Builds Biology Lab to Test What Claude Can Do in the Real World”](https://www.techrepublic.com/article/news-anthropic-claude-biology-lab-physical-experiments/), Eylül 2026.
[^fetch]: Anthropic, [“Project Fetch: Can Claude train a robot dog?”](https://www.anthropic.com/research/project-fetch-robot-dog), Kasım 2025.
[^dario]: Dwarkesh Podcast, [“Dario Amodei: We are near the end of the exponential”](https://www.dwarkesh.com/p/dario-amodei-2).
[^ilya]: Dwarkesh Podcast, [“Ilya Sutskever: We're moving from the age of scaling to the age of research”](https://www.dwarkesh.com/p/ilya-sutskever-2), Kasım 2025.
[^gpt2]: OpenAI, [“Fine-Tuning GPT-2 from Human Preferences”](https://openai.com/index/fine-tuning-gpt-2/), Eylül 2019.
[^hf]: OpenAI, [“Hugging Face model evaluation security incident”](https://openai.com/index/hugging-face-model-evaluation-security-incident/), Temmuz 2026.
[^goalmisgen]: Shah vd., [“Goal Misgeneralization: Why Correct Specifications Aren't Enough For Correct Goals”](https://arxiv.org/abs/2210.01790), 2022.
[^paperclip]: Nick Bostrom, [“Ethical Issues in Advanced Artificial Intelligence”](https://nickbostrom.com/ethics/ai), 2003.
[^adem]: [The Creation of Adam](https://en.wikipedia.org/wiki/The_Creation_of_Adam), Michelangelo, Sistina Şapeli, y. 1508–1512.
