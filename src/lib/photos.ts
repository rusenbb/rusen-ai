import generatedManifest from "@/content/photos.generated.json";

export type PhotoLocale = "tr" | "en" | "ja";

export type PhotoSource = {
  url: string;
  width: number;
};

type SeriesId = "prologue" | "neighbours" | "garden" | "reflections" | "after-light";

export type PhotoTranslation = {
  alt: string;
  title: string;
  story: string;
};

type SeriesTranslation = {
  title: string;
  description: string;
};

export type Photo = {
  id: string;
  filename: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurDataUrl: string;
  alt: string;
  title: string;
  story: string;
  translations: Record<PhotoLocale, PhotoTranslation>;
  seriesId: SeriesId;
  seriesTitle: string;
  seriesTitles: Record<PhotoLocale, string>;
  sources: {
    thumbnail: PhotoSource;
    display: PhotoSource;
    large: PhotoSource;
  };
};

export type PhotoSeries = {
  id: Exclude<SeriesId, "prologue">;
  number: string;
  title: string;
  description: string;
  translations: Record<PhotoLocale, SeriesTranslation>;
  rows: Photo[][];
};

type EditorialEntry = {
  seriesId: SeriesId;
  translations: Record<PhotoLocale, PhotoTranslation>;
};

const PHOTO_COPY = {
  dscf0930: {
    seriesId: "prologue",
    translations: {
      tr: {
        alt: "Rize sahilindeki kırmızı yürüyüş yolunda, denizle fotoğrafçının gölgesini birleştiren çift pozlamalı bir otoportre.",
        title: "Bir Başlangıcın Otoportresi",
        story:
          "Rize sahilindeki kırmızı yürüyüş yolu, deniz ve gölgem bu çift pozlamada aynı yüzeyde buluştu. Bu karede yalnızca yeni bir teknik keşfetmedim; gördüğüm ayrıntıları bir araya getirip estetik bir bütün olarak saklayabileceğim, bana ait bir ifade biçimi de buldum. Fotoğrafçılığa gerçekten tutunduğum ve “bu hobi bana göre” dediğim an, yüzümün görünmediği bu otoportreyle başladı.",
      },
      en: {
        alt: "A double-exposure self-portrait combining the sea with the photographer’s shadow on Rize’s red seafront promenade.",
        title: "Self-Portrait of a Beginning",
        story:
          "Rize’s red seafront promenade, the sea, and my shadow meet on a single surface in this double exposure. I discovered more than a new technique in this frame: I found a language of my own, a way to bring together the details I notice and preserve them as an aesthetic whole. The moment I truly committed to photography and thought, “this is for me,” began with this self-portrait in which my face never appears.",
      },
      ja: {
        alt: "リゼの海辺にある赤い遊歩道で、海と写真家の影を重ねた二重露光の自画像。",
        title: "始まりの自画像",
        story:
          "リゼの海辺にある赤い遊歩道と海、そして自分の影が、この二重露光の中でひとつの面に重なった。この一枚で見つけたのは、新しい技法だけではない。目に留まった細部を結び合わせ、美しいひとつの形として残すための、自分自身の表現の言葉だった。写真に本気で向き合い、「これは自分に合っている」と確信した瞬間は、顔の写らないこの自画像から始まった。",
      },
    },
  },
  dscf0538: {
    seriesId: "neighbours",
    translations: {
      tr: {
        alt: "Kuzguncuk’ta açık renkli bir duvarla koyu yeşil yaprakların arasında duran turuncu bir kedi.",
        title: "Evin Sahibi",
        story:
          "Kuzguncuk’a evlerini fotoğraflamak için gitmiştim. İkindi ışığında karşıma çıkan bu kedi, günün bütün mimarisini sessizce geride bıraktı; o geziden en çok sevdiğim fotoğraf bir evin değil, onun kedisinin oldu.",
      },
      en: {
        alt: "An orange cat between a pale wall and dark green leaves in Kuzguncuk.",
        title: "Keeper of the House",
        story:
          "I went to Kuzguncuk to photograph its houses. Then this cat appeared in the late-afternoon light and quietly outshone every building; my favourite photograph from the walk belonged not to a house, but to its cat.",
      },
      ja: {
        alt: "クズグンジュクの淡い壁と深い緑の葉の間にいる茶トラ猫。",
        title: "家の主",
        story:
          "家々を撮るためにクズグンジュクへ出かけた。けれど午後の光の中に現れたこの猫は、すべての建物を静かに追い越した。その散歩でいちばん好きな一枚は、家ではなく、そこに暮らす猫の写真になった。",
      },
    },
  },
  dscf3613: {
    seriesId: "neighbours",
    translations: {
      tr: {
        alt: "Ankara Çankaya’da bir kent çıkıntısına boylu boyunca uzanmış turuncu bir kedi.",
        title: "Kımıldamadan",
        story:
          "Çankaya’da insanlar çevresinden akıp giderken o, bütün ağırlığıyla olduğu yere uzanmıştı. Şehrin telaşına karşı sunduğu tek cevap, kımıldamamaktı.",
      },
      en: {
        alt: "An orange cat stretched at full length on a city ledge in Çankaya, Ankara.",
        title: "Without Moving",
        story:
          "People streamed past in Çankaya while the cat lay there with its full weight surrendered to the ground. Its only answer to the urgency of the city was not to move.",
      },
      ja: {
        alt: "アンカラのチャンカヤで、街の縁に長々と横たわる茶トラ猫。",
        title: "動かずに",
        story:
          "チャンカヤでは人々が絶えず通り過ぎていたが、猫は全身の重みを地面に預けて横たわっていた。街のせわしなさに対する答えは、ただ動かないことだった。",
      },
    },
  },
  dscf2138: {
    seriesId: "neighbours",
    translations: {
      tr: {
        alt: "Açık göğün altında mavi bir korkuluğa tünemiş, şehri izleyen bir güvercin.",
        title: "Biri Beni İzliyor I",
        story:
          "Güvercin şehri kendi sessizliğinde izlerken kameranın varlığından habersiz görünüyordu. O an kadrajın tek gözlemcisi olduğumu sanmıştım.",
      },
      en: {
        alt: "A pigeon watching the city from a blue rail beneath an open sky.",
        title: "Somebody Is Watching Me I",
        story:
          "The pigeon seemed unaware of the camera as it watched the city in its own silence. For that moment, I thought I was the only observer in the frame.",
      },
      ja: {
        alt: "開けた空の下、青い手すりから街を見つめる鳩。",
        title: "誰かが見ている I",
        story:
          "鳩は自分だけの静けさの中で街を眺め、カメラには気づいていないようだった。その瞬間、フレームの中で見ているのは自分だけだと思っていた。",
      },
    },
  },
  dscf2137: {
    seriesId: "neighbours",
    translations: {
      tr: {
        alt: "Yıpranmış mavi bir korkuluktan doğrudan kameraya bakan bir güvercin.",
        title: "Biri Beni İzliyor II",
        story:
          "Sonra birden başını çevirdi. Bakışındaki dikkat, şehirde yalnızca bizim bakmadığımızı; başka hayatların da bizi izlediğini hatırlattı.",
      },
      en: {
        alt: "A pigeon turning to look directly at the camera from a weathered blue rail.",
        title: "Somebody Is Watching Me II",
        story:
          "Then it suddenly turned its head. The attention in its gaze was a reminder that we are not the city’s only witnesses; other lives are watching us, too.",
      },
      ja: {
        alt: "古びた青い手すりからカメラをまっすぐ見返す鳩。",
        title: "誰かが見ている II",
        story:
          "すると突然、こちらへ顔を向けた。その鋭い視線は、街を見ているのが私たちだけではなく、別の命もまた私たちを見ているのだと思い出させた。",
      },
    },
  },
  dscf0657: {
    seriesId: "garden",
    translations: {
      tr: {
        alt: "Gecenin loşluğunda karanlık bir bahçeden öne çıkan beyaz bir gül.",
        title: "Karanlıkta Bile",
        story:
          "Beyaz gül benim için lekesiz bir sevginin imgesi. Gecenin loşluğunda kendi ışığını bulması, böyle bir sevginin karanlığın içinde dahi varlığını koruyabileceğini düşündürüyor.",
      },
      en: {
        alt: "A white rose emerging from a dim garden at night.",
        title: "Even in the Dark",
        story:
          "The white rose is, to me, an image of love left unstained. That it can find its own light in the dimness of night suggests that such a love can remain alive even inside darkness.",
      },
      ja: {
        alt: "夜の薄暗い庭から浮かび上がる白い薔薇。",
        title: "暗闇の中でも",
        story:
          "白い薔薇は、私にとって汚れのない愛の姿だ。夜のほの暗さの中でも自らの光を見つけるその姿は、純粋な愛が暗闇の中でも生き続けられることを思わせる。",
      },
    },
  },
  dscf0721: {
    seriesId: "garden",
    translations: {
      tr: {
        alt: "Gece ışığında düşsel bir yumuşaklığa bürünen pembe güller.",
        title: "Yumuşak Hava",
        story:
          "Gece, pembe gülleri gerçek ile düş arasında bırakıyor. Sevginin tozpembe hayali ile ona duyduğumuz gerçeğin birbirine karıştığı o belirsiz yerde duruyorlar.",
      },
      en: {
        alt: "Pink roses taking on a dreamlike softness in the night light.",
        title: "Soft Weather",
        story:
          "Night leaves the pink roses suspended somewhere between reality and dream. They inhabit the uncertain place where love’s rose-coloured fantasy meets the truth of what we feel.",
      },
      ja: {
        alt: "夜の光の中で夢のような柔らかさをまとうピンクの薔薇。",
        title: "やわらかな天気",
        story:
          "夜はピンクの薔薇を現実と夢のあわいに置く。愛を薔薇色に見る幻想と、私たちが実際に抱く感情とが溶け合う、曖昧な場所に咲いている。",
      },
    },
  },
  dscf1404: {
    seriesId: "garden",
    translations: {
      tr: {
        alt: "Sarı bir çiçeğe konmuş, arıyı taklit eden bir çiçek sineği.",
        title: "İlk Yaklaşım",
        story:
          "Onu ilk gördüğümde arı sanmıştım. Arı taklitçisi bir çiçek sineği olduğunu henüz bilmiyordum; kandırmacasının kusursuzluğu, bu karşılaşmayı daha ilk karede değerli kıldı.",
      },
      en: {
        alt: "A bee-mimicking hoverfly resting on a yellow flower.",
        title: "First Approach",
        story:
          "I thought it was a bee when I first saw it. I had yet to recognise the bee-mimicking hoverfly; the perfection of its disguise made the encounter precious from the first frame.",
      },
      ja: {
        alt: "黄色い花にとまる、ハチに擬態したハナアブ。",
        title: "最初の接近",
        story:
          "最初に見たとき、ハチだと思った。まだハチに擬態するハナアブだとは知らず、その見事な偽装が、出会いを一枚目から特別なものにした。",
      },
    },
  },
  dscf1408: {
    seriesId: "garden",
    translations: {
      tr: {
        alt: "Sarı bir çiçeğin merkezinde beslenen arı taklitçisi bir çiçek sineği.",
        title: "Merkezde",
        story:
          "Çiçeğin merkezine yerleşip beslenirken bütün dünya küçücük bir sarı alana daraldı. Taklit ettiği güçten bağımsız, kendi hayatının dikkatli ritmi görünür oldu.",
      },
      en: {
        alt: "A bee-mimicking hoverfly feeding at the centre of a yellow flower.",
        title: "At the Centre",
        story:
          "As it settled to feed, the whole world narrowed to a small field of yellow. Beyond the strength it imitated, the attentive rhythm of its own life came into view.",
      },
      ja: {
        alt: "黄色い花の中心で蜜をとる、ハチに擬態したハナアブ。",
        title: "花の中心で",
        story:
          "花の中心に身を置き食事を始めると、世界は小さな黄色い領域へと縮まった。借り物の強さの向こうに、この虫自身の慎重な生命のリズムが見えてきた。",
      },
    },
  },
  dscf1410: {
    seriesId: "garden",
    translations: {
      tr: {
        alt: "Sarı bir çiçeğin üzerinde hareket eden arı taklitçisi bir çiçek sineği.",
        title: "Geçiş",
        story:
          "Konuşu, ön ayaklarını birbirine sürtüşü ve çiçeğin üzerindeki küçük hareketleri, bir anlık karşılaşmayı uzun bir gözleme dönüştürdü. Yakından bakınca tekrarın içinde karakter belirdi.",
      },
      en: {
        alt: "A bee-mimicking hoverfly moving across a yellow bloom.",
        title: "Crossing",
        story:
          "Its landing, the rubbing of its forelegs, and each small movement across the flower turned a brief meeting into sustained observation. Seen closely, repetition began to reveal character.",
      },
      ja: {
        alt: "黄色い花の上を移動する、ハチに擬態したハナアブ。",
        title: "横切る",
        story:
          "着地し、前脚をこすり、花の上で見せる小さな動き。その一つひとつが短い出会いを長い観察へ変えた。近くで見つめると、反復の中に個性が立ち現れた。",
      },
    },
  },
  dscf1411: {
    seriesId: "garden",
    translations: {
      tr: {
        alt: "Sarı bir çiçekten havalanmaya başlayan arı taklitçisi bir çiçek sineği.",
        title: "Kalkıştan Önce",
        story:
          "Kanatlar ayaklardan önce harekete geçti. Fotoğraf, çiçeğe ait olmakla ondan ayrılmak arasındaki o küçücük kararı tuttu.",
      },
      en: {
        alt: "A bee-mimicking hoverfly beginning to lift from a yellow flower.",
        title: "Before the Lift",
        story:
          "The wings moved before the feet. The photograph held the tiny decision between belonging to the flower and leaving it behind.",
      },
      ja: {
        alt: "黄色い花から飛び立とうとする、ハチに擬態したハナアブ。",
        title: "飛び立つ前",
        story:
          "脚より先に翅が動き始めた。写真は、花に留まることと、そこを離れることの間にある、ごく小さな決断をとどめた。",
      },
    },
  },
  dscf1412: {
    seriesId: "garden",
    translations: {
      tr: {
        alt: "Bir sonraki sarı çiçeğe konan arı taklitçisi bir çiçek sineği.",
        title: "İş Sürüyor",
        story:
          "Bir sonraki çiçekte her şey yeniden başladı. Beni kandıran bu küçük sinek, geride iki ayrı ders bıraktı: tekrarın içindeki ısrarı ve tehlikeli olmakla güçlü görünmek arasındaki farkı.",
      },
      en: {
        alt: "A bee-mimicking hoverfly settled on the next yellow flower.",
        title: "The Work Continues",
        story:
          "At the next flower, everything began again. The small fly that fooled me left two lessons behind: persistence inside repetition, and the difference between being dangerous and looking strong.",
      },
      ja: {
        alt: "次の黄色い花にとまった、ハチに擬態したハナアブ。",
        title: "仕事は続く",
        story:
          "次の花で、すべてがまた始まった。私を欺いたこの小さな虫は、反復の中にある粘り強さと、危険であることと強く見えることの違いを残していった。",
      },
    },
  },
  dscf1662: {
    seriesId: "reflections",
    translations: {
      tr: {
        alt: "Rize sahilinde yağmur suyuna yansıyan bir çardak.",
        title: "Yağmurdan Sonra, Rize",
        story:
          "Rize’de yağmur dinse de şehirden çekilmez. Sahilde bıraktığı su, gündelik hayatı kendi sessizliğine alır; çardak artık yalnızca bir sığınak değil, Karadeniz’in iklimiyle kurulan hayatın hatırasıdır.",
      },
      en: {
        alt: "A seaside shelter reflected in rainwater on the coast of Rize.",
        title: "Rize, After the Rain",
        story:
          "Even when the rain stops in Rize, it does not leave the city. The water it leaves by the shore gathers daily life into its silence; the shelter becomes not merely a refuge, but a memory of life shaped by the Black Sea climate.",
      },
      ja: {
        alt: "リゼの海岸で、雨水に映る東屋。",
        title: "雨上がりのリゼ",
        story:
          "リゼでは、雨がやんでも街から去ることはない。海辺に残した水が日々の暮らしを静けさの中へ抱き込み、東屋は単なる雨宿りではなく、黒海の気候とともに営まれる生活の記憶になる。",
      },
    },
  },
  dscf1690: {
    seriesId: "reflections",
    translations: {
      tr: {
        alt: "Rize yazısının, dağların ve gökyüzünün yağmur suyundaki yansıması.",
        title: "Göğün Adı: Rize",
        story:
          "Yağmur göğü yere indirmiş; Rize’nin adını da onun içine bırakmış. Dağı, çayı ve bulutuyla şehir, Karadeniz’in kendine tuttuğu aynaya dönüşüyor.",
      },
      en: {
        alt: "The name Rize, the mountains, and the sky reflected in rainwater.",
        title: "The Sky’s Name: Rize",
        story:
          "Rain has brought the sky down to earth and placed Rize’s name inside it. With mountain, tea, and cloud held together, the city becomes the mirror the Black Sea turns upon itself.",
      },
      ja: {
        alt: "雨水に映るリゼの文字、山並み、そして空。",
        title: "空の名は、リゼ",
        story:
          "雨が空を地上へ降ろし、その中にリゼの名を置いた。山と茶と雲を一つに抱き、街は黒海地方が自らへ向けた鏡になる。",
      },
    },
  },
  dscf1669: {
    seriesId: "reflections",
    translations: {
      tr: {
        alt: "Yeşil bitkilerin ardından yağmur suyuna yansıyan Rize yazısı ve çay bahçeleri.",
        title: "Toprağın Adı: Rize",
        story:
          "Adı suda, kökü yeşilde. Çay, yağmur ve toprak aynı kökten konuşurken Rize, bir şehirden fazlası olup bir memlekete dönüşüyor.",
      },
      en: {
        alt: "The name Rize and tea gardens reflected in rainwater beyond green plants.",
        title: "The Earth’s Name: Rize",
        story:
          "Its name rests in water; its roots are in green. As tea, rain, and earth speak from the same root, Rize becomes more than a city and turns into a homeland.",
      },
      ja: {
        alt: "緑の草越しに、雨水へ映るリゼの文字と茶畑。",
        title: "大地の名は、リゼ",
        story:
          "その名は水にあり、根は緑にある。茶と雨と大地が同じ根から語り始めるとき、リゼは一つの都市を超え、故郷へと変わっていく。",
      },
    },
  },
  dscf3718: {
    seriesId: "reflections",
    translations: {
      tr: {
        alt: "Yeşil ışığın ağaç yaprakları üzerine düşürdüğü insan gölgesi.",
        title: "Ödünç Yapraklar",
        story:
          "Bitkiler zarar görmeden geceyi aydınlatmak için seçilen yeşil ışık, beklenmedik bir portre bıraktı. Doğayı koruma niyeti, insan gölgesini yeniden onun içine yerleştirdi.",
      },
      en: {
        alt: "A human shadow cast across leaves by a green garden light.",
        title: "Borrowed Leaves",
        story:
          "A green light chosen to illuminate the night without disturbing the plants left an unexpected portrait behind. An act of care placed the human shadow back inside nature.",
      },
      ja: {
        alt: "庭の緑色の光が葉の上に落とした人の影。",
        title: "借りた葉",
        story:
          "植物を傷めず夜を照らすために選ばれた緑の光が、思いがけない肖像を残した。自然をいたわる意図が、人の影をもう一度その内側へ置いた。",
      },
    },
  },
  dscf3728: {
    seriesId: "reflections",
    translations: {
      tr: {
        alt: "Pamuk Prenses figürüyle pembe çiçekleri birleştiren çift pozlama.",
        title: "Masal Çiçek Açınca",
        story:
          "Pamuk Prenses’in dinginliği, pembe çiçeklerin canlılığıyla derinleşiyor. Masal ile bahar birbirine karışırken zarafet, kadrajın tamamına yayılan sessiz bir büyüye dönüşüyor.",
      },
      en: {
        alt: "A double exposure combining Snow White with vivid pink flowers.",
        title: "When the Tale Blossoms",
        story:
          "Snow White’s stillness deepens in the vitality of pink flowers. As tale and spring merge, grace becomes a quiet enchantment that spreads across the entire frame.",
      },
      ja: {
        alt: "白雪姫の像と鮮やかなピンクの花を重ねた多重露光。",
        title: "物語が花開くとき",
        story:
          "白雪姫の静けさが、ピンクの花の生命力によって深まっていく。物語と春が溶け合うとき、優雅さはフレーム全体へ広がる静かな魔法になる。",
      },
    },
  },
  dscf2353: {
    seriesId: "after-light",
    translations: {
      tr: {
        alt: "Rize’de ağır yağmur bulutlarının arasından süzülen güneş ışınları.",
        title: "Havanın Açıldığı Yer",
        story:
          "Rize’nin kapalı göğünün ardında ışık hep oradaydı. Bulutların arasından süzülüşü, aydınlığın yaşadıklarımızdan bağımsız olarak varlığını sürdürdüğünü; bazen yalnızca ona bakmayı seçmemiz gerektiğini hatırlatıyor.",
      },
      en: {
        alt: "Sunbeams passing through heavy rain clouds above Rize.",
        title: "Weather Opening",
        story:
          "Behind Rize’s overcast sky, the light had always been there. Its passage through the clouds is a reminder that brightness exists beyond what we are living through; sometimes we need only choose to look toward it.",
      },
      ja: {
        alt: "リゼの厚い雨雲の間から差し込む太陽の光。",
        title: "空がひらく場所",
        story:
          "リゼの閉ざされた空の向こうで、光はずっと存在していた。雲間を抜けるその姿は、明るさが私たちの経験とは別に在り続け、時にはただそこへ目を向ければよいのだと思い出させる。",
      },
    },
  },
  dscf4130: {
    seriesId: "after-light",
    translations: {
      tr: {
        alt: "Ay ve sokak lambasının altında, boş görünen bir sokaktan geçen hareketli bir figür.",
        title: "Sessiz Saat",
        story:
          "Gecenin en tenha saatinde ay ile boş sokak baş başa görünüyordu; sonra bir yaya kadraja girdi. Biz göremesek de hareketin sürdüğünü, hayatın en derin sessizlikte bile bütünüyle durmadığını hatırlattı.",
      },
      en: {
        alt: "A moving figure crossing a seemingly empty street beneath the moon and a streetlamp.",
        title: "The Quiet Hour",
        story:
          "At the loneliest hour of night, the moon and the empty street seemed alone; then a pedestrian entered the frame. Even when unseen, movement continues, and life never comes entirely to rest inside the deepest silence.",
      },
      ja: {
        alt: "月と街灯の下、一見無人の通りを横切る人影。",
        title: "静かな時間",
        story:
          "夜が最も静まる時間、月と空の通りだけが向き合っているように見えた。そこへ一人の歩行者が現れた。見えなくても動きは続き、深い静寂の中でも命は完全には止まらない。",
      },
    },
  },
  dscf4251: {
    seriesId: "after-light",
    translations: {
      tr: {
        alt: "Mor filtreyle çevresindeki renklerden ayrılan küçük bir mor çiçek.",
        title: "Gece Çiçeği",
        story:
          "Bazen güzelliği gerçekten görebilmek için çevresindeki renkleri susturmak gerekir. Mor tek başına kaldığında, sıradan bir çiçek bile dikkatin gürültüyü nasıl dönüştürebildiğini gösteriyor.",
      },
      en: {
        alt: "A small purple flower isolated from surrounding colours by a violet filter.",
        title: "Night Bloom",
        story:
          "Sometimes, to truly see beauty, the colours around it must be quieted. Left alone, violet shows how attention can transform even an ordinary flower by clearing away the noise.",
      },
      ja: {
        alt: "紫のフィルターによって周囲の色から切り離された小さな紫の花。",
        title: "夜の花",
        story:
          "美しさを本当に見るには、ときに周囲の色を静める必要がある。紫だけが残ると、ありふれた花さえ、注意を向けることが雑音をどれほど変えられるかを教えてくれる。",
      },
    },
  },
  dscf4267: {
    seriesId: "after-light",
    translations: {
      tr: {
        alt: "Koyu bir gökyüzüne karşı neredeyse bütün kadrajı dolduran kırmızı güller.",
        title: "Kırmızı, Neredeyse Siyah",
        story:
          "Aşk gözümüzü bütünüyle doldurduğunda dünyanın geri kalanı karanlığa çekilir. Geriye yalnızca kırmızının çağrısı kalır: yoğun, mutlak ve başka hiçbir şeye yer bırakmayan; aşkın içinde bir hayat.",
      },
      en: {
        alt: "Red roses filling nearly the entire frame against a dark sky.",
        title: "Red, Almost Black",
        story:
          "When love fills our vision completely, the rest of the world withdraws into darkness. Only the call of red remains: intense, absolute, leaving room for nothing else—a life held inside love.",
      },
      ja: {
        alt: "暗い空を背に、画面のほとんどを占める赤い薔薇。",
        title: "赤、ほとんど黒",
        story:
          "愛が視界をすべて満たすとき、残りの世界は暗闇へ退いていく。あとに残るのは赤の呼び声だけ。激しく、絶対的で、ほかの何ものにも場所を譲らない。愛の中にある人生。",
      },
    },
  },
  dscf4269: {
    seriesId: "after-light",
    translations: {
      tr: {
        alt: "Mavi gökyüzü ve yapraklarla birlikte görünen, arkadan aydınlatılmış kırmızı güller.",
        title: "Maviyi Hâlâ Taşırken",
        story:
          "Aşk kör etmediğinde çevresindeki hayatı da görünür kılar. Gül bu kez gökyüzüyle birlikte anlam kazanır; hayatın içinde bir aşk, dünyayı silmeden ona karışır.",
      },
      en: {
        alt: "Backlit red roses seen together with their leaves and a blue sky.",
        title: "Still Holding Blue",
        story:
          "When love does not blind us, it reveals the life around it as well. Here the rose finds meaning together with the sky: love within a life, joining the world without erasing it.",
      },
      ja: {
        alt: "葉と青い空を背景に、逆光で浮かぶ赤い薔薇。",
        title: "まだ青を抱いて",
        story:
          "愛が目を閉ざさないとき、その周りにある人生も見えるようになる。ここでは薔薇が空とともに意味を持つ。世界を消さず、その中へ溶けていく、人生の中の愛。",
      },
    },
  },
} as const satisfies Record<string, EditorialEntry>;

const PROLOGUE_TITLES: Record<PhotoLocale, string> = {
  tr: "Önsöz",
  en: "Prologue",
  ja: "序章",
};

const SERIES = [
  {
    id: "neighbours",
    number: "01",
    translations: {
      tr: {
        title: "Komşular",
        description:
          "Şehir yalnızca acele edenlere ait değil. Kediler bütün ağırlıklarıyla duruyor, bir güvercin bakışımızı geri veriyor; komşuluk, başka bir hayatın da bizi fark ettiğini anladığımız yerde başlıyor.",
      },
      en: {
        title: "The Neighbours",
        description:
          "The city does not belong only to those in a hurry. The cats hold their ground and a pigeon returns our gaze; neighbourliness begins where we realise that another life has noticed us, too.",
      },
      ja: {
        title: "隣人たち",
        description:
          "街は、急ぐ者だけのものではない。猫たちはその場にどっしりと留まり、鳩はこちらの視線を返す。隣人であることは、別の命もまた自分を見ていると気づく場所から始まる。",
      },
    },
    rows: [["dscf0538", "dscf3613"], ["dscf2138", "dscf2137"]],
  },
  {
    id: "garden",
    number: "02",
    translations: {
      tr: {
        title: "Bir Bahçe, Bir Mesai",
        description:
          "Biz güllere aşkı yakıştırırken, arı sandığım küçük sinek hiçbir metafora aldırmadan mesaisini sürdürüyor. Bahçe, anlam yüklediğimiz güzellikle kendi ritminde devam eden hayatın yan yana çalıştığı yer.",
      },
      en: {
        title: "A Garden Is a Workplace",
        description:
          "While we ask roses to speak for love, the little fly I mistook for a bee carries on with its shift, indifferent to metaphor. A garden is where the beauty we interpret and the life that simply continues work side by side.",
      },
      ja: {
        title: "庭は仕事場",
        description:
          "私たちが薔薇に愛を語らせているあいだ、ハチだと思った小さなハナアブは、比喩など気にも留めず仕事を続けている。庭とは、私たちが意味を託す美しさと、自らのリズムで続く命が並んで働く場所だ。",
      },
    },
    rows: [
      ["dscf0657", "dscf0721"],
      ["dscf1404", "dscf1408"],
      ["dscf1410", "dscf1411", "dscf1412"],
    ],
  },
  {
    id: "reflections",
    number: "03",
    translations: {
      tr: {
        title: "Bakmanın Yolları",
        description:
          "Bazı görüntüler doğrudan karşımızda değildir; suya, yaprağa ya da başka bir kareye uğradıktan sonra kendini gösterir. Dünya aynı kalsa bile, bakışın geçtiği yüzey onu yeniden kurar.",
      },
      en: {
        title: "Ways of Looking",
        description:
          "Some images do not appear directly before us; they reveal themselves only after passing through water, leaves, or another frame. The world may remain the same, yet every surface the gaze crosses builds it anew.",
      },
      ja: {
        title: "見るということ",
        description:
          "いくつかの像は、正面からは現れない。水や葉、あるいは別の一枚を通り抜けて、ようやく姿を見せる。世界が同じままでも、視線の通過する面がそれを新しく組み直す。",
      },
    },
    rows: [
      ["dscf1662", "dscf1690", "dscf1669"],
      ["dscf3718", "dscf3728"],
    ],
  },
  {
    id: "after-light",
    number: "04",
    translations: {
      tr: {
        title: "Işık Çekilirken",
        description:
          "Gündüz her şeyi aynı anda gösterir; karanlık seçim yaptırır. Geriye bulutların arasındaki ışık, yoluna devam eden bir yabancı, süzülmüş bir mor ve aşkın iki ayrı odağı kalır.",
      },
      en: {
        title: "Light on Its Way Out",
        description:
          "Daylight shows everything at once; darkness forces a choice. What remains is light between clouds, a stranger still moving, purple distilled from the noise, and two different places for love to put its focus.",
      },
      ja: {
        title: "光が去るまで",
        description:
          "昼の光はすべてを同時に見せるが、暗闇は何を見るかを選ばせる。残るのは、雲間の光、歩き続ける誰か、雑音から濾し取られた紫、そして愛が焦点を結ぶ二つの場所。",
      },
    },
    rows: [["dscf2353"], ["dscf4130", "dscf4251"], ["dscf4267", "dscf4269"]],
  },
] as const;

const generatedById = new Map(
  generatedManifest.photos.map((photo) => [photo.id, photo]),
);
const seriesById = new Map(SERIES.map((series) => [series.id, series]));

function resolvePhoto(id: string): Photo {
  const generated = generatedById.get(id);
  const editorial = PHOTO_COPY[id as keyof typeof PHOTO_COPY];
  if (!generated) throw new Error(`Photo ${id} is missing from the generated manifest`);
  if (!editorial) throw new Error(`Photo ${id} is missing editorial copy`);

  let resolvedTitles: Record<PhotoLocale, string>;
  if (editorial.seriesId === "prologue") {
    resolvedTitles = PROLOGUE_TITLES;
  } else {
    const series = seriesById.get(editorial.seriesId);
    if (!series) throw new Error(`Series ${editorial.seriesId} is missing copy`);
    resolvedTitles = {
      tr: series.translations.tr.title,
      en: series.translations.en.title,
      ja: series.translations.ja.title,
    };
  }

  return {
    ...generated,
    ...editorial.translations.en,
    translations: editorial.translations,
    seriesId: editorial.seriesId,
    seriesTitle: resolvedTitles.en,
    seriesTitles: resolvedTitles,
  };
}

export const heroPhoto = resolvePhoto("dscf0930");
export const photoSeries: PhotoSeries[] = SERIES.map((series) => ({
  id: series.id,
  number: series.number,
  title: series.translations.en.title,
  description: series.translations.en.description,
  translations: series.translations,
  rows: series.rows.map((row) => row.map(resolvePhoto)),
}));
export const photoRows = photoSeries.flatMap((series) => series.rows);
export const allPhotos = [heroPhoto, ...photoRows.flat()];
