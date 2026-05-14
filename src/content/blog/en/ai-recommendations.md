---
title: "AI Recommendations"
date: "2026-03-04"
description: "A guide for aspiring AI researchers and engineers — from finding your motivation to mastering deep learning, computer vision, NLP, and data engineering."
tags:
  - "ai"
  - "guide"
  - "deep-learning"
  - "machine-learning"
translationKey: "ai-recommendations"
---

> *by [rusen birben](http://rusenbirben.com) [@fictionstudios](http://fictionstudios.ai)*

> Do what you love or love what you do. Because you can only live once.

Hi, my name is Ruşen. I've graduated from the AI and data engineering program of ITU. I LOVE what I'm doing and the field I'm in. There have been things I wished someone have told me throughout my journey in being a passionate AI researcher. So here I'm, sharing my insights with younger generations so that they can benefit. I wish to be helpful. Good luck!

---

# Getting to know your relationship with your interests/goals

I know this sounded like a self-help page after reading the above title. But I believe abstracting our **characters** from our **professional roles/career goals** is not a good approach. Even though we humans have many sides, we're at the end of the day, a whole. So I give you (in a concise way) in which way our high level interests should be oriented.

### What are good goals

- Learning things that **makes us valuable**
- Having **real connections** with people
- **Providing value** to people

### What are NOT good goals

- Getting great grades
- Having many friends
- Getting rich

**A short rationale:**

**Intrinsic motivation** involves engaging in activities for their inherent satisfaction, while **extrinsic motivation** is driven by external rewards or avoiding punishment. Research indicates that intrinsic motivation is associated with higher creativity, persistence, and overall well-being (Ryan & Deci, 2000). Conversely, extrinsic motivators can sometimes diminish intrinsic interest, especially when perceived as controlling (Deci, Koestner, & Ryan, 1999). *Striking a balance between both types of motivation can lead to optimal performance and satisfaction.*

Good goals, such as learning valuable skills, forming genuine connections, and providing value to others, are typically driven by intrinsic motivation. These goals are satisfying because they meet our **deeper needs for growth, connection, and contribution**. For example, learning new things brings a sense of accomplishment and personal growth, while building real connections with people fulfills our social needs and fosters a sense of belonging. Providing value to others offers a profound sense of purpose and fulfillment as we witness the positive impact of our actions.

On the other hand, goals like achieving high grades, having numerous friends, or becoming wealthy are often motivated by **extrinsic factors**. These goals are pursued for external rewards or to avoid negative outcomes, such as gaining social approval or amassing material wealth. While achieving these goals can provide *temporary satisfaction*, they often don't lead to long-term happiness or fulfillment. In fact, an excessive focus on extrinsic goals can undermine intrinsic motivation and overall well-being.

> TLDR; have good goals. Stay motivated from the things that you do, not the things you get.
>
> As Marcus Aurelius -the great roman emperor- puts it famously:
>
> *You have power over your mind, not outside events. Realize this and you'll have strength.*

> With these being said, here are the suggestions by me to guide your studies and resources help you reach your 'goals' :)

# How to learn?

## Python

As in learning any programming language, you NEED to write code. Do not complain by saying things like "LLMs are already doing programming", they are able to do these tasks. But the big picture is not to learn a specific language but to get familiar oneself with the concept of programming. And unless we find a way to integrate LLMs into our brains, we need to study and experiment to actually get the big ideas in programming. Programming ideas stick together not when you hear or see them, but actually **experiment with them.** Because only you can know the perspective you have on the concepts and trying and failing with the wrong ways (and understanding why things fail) **IS** the way to actually understand the programming concepts.

That being said, one can have **better reinforcements** and get to understand what to experiment and what to not even try by utilizing certain tools. I found LLMs to be perfect explainers (especially RAG models like perplexity) they can go through the documentations quickly and pinpoint the exact issue. They can provide information and theoretical insights on why things work or doesn't work.

> **Remember:** When using LLMs for **LEARNING** in general, do not be lazy and copy/paste the results. This is not going to teach you anything, remember the big idea is to add complexity to your self. LLMs are good explainers (writers), provide them with correct information (documentation) and you have great tutors (perplexity-like RAG methods). You are not in elementary school, do not cheat from the answer keys.

Tip:

1- Enjoying through the process makes your life extremely easier. Find projects that you can work on. This *might* also help you find the area you'd like to specialize in later ;)

e.g. using python (while learning) I scraped data from anime sites and downloaded them (I like watching anime) which led me to go through automation with selenium (python library) which made me curious on web bots/game bots and eventually led me to work on AI.

This was not the only thing that made me discover my interest in the field, but it was an important milestone for me.

Here are some resources to make your life easier:

- [Automate the Boring Stuff with Python](https://automatetheboringstuff.com/#toc)
- [Real Python](https://realpython.com/)
- [Corey Schafer (YouTube)](https://www.youtube.com/@coreyms)
- [Tech With Tim (YouTube)](https://www.youtube.com/@TechWithTim)

Remember: no resource is better teacher than your own effort.

## Basics of ML

Machine learning (ML) is a subset of artificial intelligence that enables computers to learn from data without explicit programming. Unlike traditional programming which are explicitly programmed, ML creates models that learn from data, improving tasks autonomously.

ML approaches include supervised learning (using labeled data), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through interaction). Understanding ML requires knowledge of linear algebra ([Strang](https://www.youtube.com/playlist?list=PL221E2BBF13BECF6C) & [3B1B](https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab)) for data representation, calculus ([Single](https://www.youtube.com/playlist?list=PL590CCC2BC5AF3BC1) & [Multivariate](https://www.youtube.com/playlist?list=PL4C4C8A7D06566F38) & [3B1B](https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr)) for optimization, and probability and statistics ([Bertsekas](https://youtube.com/playlist?list=PLUl4u3cNGP60A3XMwZ5sep719_nh95qOe&feature=shared)) for data analysis. Programming skills, especially in Python, are also essential for implementing ML algorithms.

As you begin your ML journey, it's important to familiarize yourself with fundamental algorithms such as linear regression, logistic regression, decision trees, support vector machines (SVMs), and neural networks. To implement these algorithms and work with data, you'll likely use popular ML libraries and frameworks (*though I urge you to try to implement them from scratch using python and with the help of LLMs*). Some key ones include scikit-learn for traditional ML algorithms, TensorFlow and PyTorch for deep learning, and pandas and NumPy for data manipulation and numerical operations.

Before applying ML algorithms, data often needs to be prepared through a process known as preprocessing and feature engineering. This involves cleaning the data (handling missing values and outliers), transforming it (normalizing or scaling features), and potentially creating new features or selecting relevant ones. Try to understand the reasoning behind these operations. Once you've trained a model, understanding how to assess its performance is crucial. Common metrics include accuracy, precision, recall, F1-score, and ROC-AUC. You should know the drawbacks and strengths of each performance metric to know when to use which. You should also be familiar with validation techniques like cross-validation and hold-out sets, and methods to avoid overfitting such as regularization and early stopping.

> **To truly grasp these concepts, it's essential to work on practical projects.** Start with simple ones and gradually increase complexity. Some beginner-friendly projects include iris flower classification, house price prediction, sentiment analysis of movie reviews, and image classification with the MNIST dataset.

Online courses like Andrew Ng's Machine Learning course on Coursera (videos are also available on YouTube but without the coding exercises, though codes are available on GitHub) is an excellent starting point. Books such as "Introduction to Machine Learning with Python" by Müller and Guido and "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow" by Aurélien Géron provide comprehensive coverage. Platforms like Kaggle offer datasets, competitions, and tutorials, while Google Colab provides free cloud-based Jupyter notebooks. For specific coding questions, perplexity is invaluable, and Reddit's r/MachineLearning is great for discussions and staying updated on the field.

You may use [libgen](https://libgen.li/) to access the PDFs of these books (in fact any book), but I DO NOT recommend that and instead urge you to buy them because having (and promoting) the PDFs of the copyrighted books is illegal. Even though it's exactly the same with the paperback's (and you can have them for free from the website libgen) :)

Remember, the key to mastering ML is hands-on practice. Use these resources as guides, but **focus on implementing algorithms yourself** and **working on projects that interest you.** By combining theoretical knowledge with practical application, you'll develop a deep understanding of machine learning principles and be well-prepared to tackle more advanced topics in the field.

Here are some resources to make your life easier:

- Hands on Machine Learning book's GitHub repo - HIGHLY RECOMMENDED
- [StatQuest (YouTube)](https://www.youtube.com/@statquest)
- [Google Colab](https://colab.research.google.com/) - RECOMMENDED (if no local GPU)
- [Kaggle](https://kaggle.com/)
- [Andrew Ng's ML Specialization (Coursera)](https://www.coursera.org/specializations/machine-learning-introduction) - HIGHLY RECOMMENDED
- [Andrew Ng's ML Course (YouTube, free)](https://www.youtube.com/playlist?list=PLkDaE6sCZn6FNC6YRfRQc_FbeQrF8BwGI)
- [3Blue1Brown - Neural Networks](https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi)
- [Perplexity](https://www.perplexity.ai/) - HIGHLY RECOMMENDED
- [Stanford's ML Course by Andrew Ng](https://youtube.com/playlist?list=PLoROMvodv4rMiGQp3WXShtMGgzqpfVfbU&feature=shared)

Remember: no resource is better teacher than your own effort.

## Learning Deep Learning

(Having the intuition & getting familiar with typical architectures)

Start by mastering the basics of feedforward neural networks, which form the foundation of deep learning. Understanding concepts like backpropagation and gradient descent is crucial, as they form the backbone of how neural networks learn.

As you progress, familiarize yourself with the most common deep learning architectures:

1. **Convolutional Neural Networks (CNNs):** These are the workhorses of computer vision tasks. CNNs use convolutional layers to automatically learn features from images, making them incredibly powerful for tasks like image classification, object detection, and image segmentation.
2. **Recurrent Neural Networks (RNNs):** These networks are designed to handle sequential data, making them ideal for tasks involving time series or natural language. Pay special attention to Long Short-Term Memory (LSTM) networks, a type of RNN that excels at capturing long-term dependencies in data.
3. **Autoencoders:** These unsupervised learning models are great for dimensionality reduction and feature learning. They work by compressing input data into a lower-dimensional representation and then reconstructing it.
4. **Generative Adversarial Networks (GANs):** These fascinating architectures consist of two neural networks competing against each other, enabling the generation of new, synthetic data that resembles the training set.

To build your intuition, implement these architectures from scratch using Python and libraries like NumPy [may seem scary at first, and it is :') but you need to get familiar with these topics one way or another **if you want to stand out**]. This hands-on approach will deepen your understanding of how each component contributes to the network's overall function. Don't hesitate to use resources like perplexity, online forums or your seniors when you encounter challenges.

Remember, the key to mastering deep learning is practice. Work on projects that interest you, experiment with different architectures, and don't be afraid to make mistakes. Each error is an opportunity to learn and refine your understanding.

Tip:

The deep learning course by Andrew Ng on Coursera (deeplearning.ai) does an exceptional job at explaining the topics from the ground up. You'll have the chance to understand the architectures deeply by implementing them.

Again, 3Blue1Brown is gold. Also you may start to read research papers at this point.

Here are some resources to make your life easier (I highly recommend all of them, you may pick between d2l or udl):

- [Deep Learning Specialization (Coursera)](https://www.coursera.org/specializations/deep-learning) (or search lectures on YouTube)
- [3Blue1Brown - Neural Networks](https://youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi&feature=shared)
- [Dive into Deep Learning (d2l.ai)](https://d2l.ai/) (has interactive notebooks)
- [Understanding Deep Learning (UDL)](https://udlbook.github.io/udlbook/) (has interactive notebooks)
- [Deep Learning Book by Goodfellow et al.](https://www.deeplearningbook.org/)
- [Hugging Face](https://huggingface.co/)

Remember: no resource is better teacher than your own effort.

## Mastering Deep Learning

(Having in-depth knowledge and knowing niche, complex, experimental or task-specific architectures)

Mastering deep learning is an open task, no one can really claim to `master` anything (as that would imply there wouldn't be anything greater than your understanding). But what I mean here is not 'knowing it all' but having the thorough understanding to **be able to make your own architecture** or **to deeply understand why different methods work or fail**. Of course, even these definitions are somewhat incomplete. As there are things that we do not know 'why works'. But this is where science starts, right!?

If you're not interested in improving the current research and just applying things (this is not a shameful thing by the way, you may find start-ups or be an excellent engineer with the knowledge you have), you may not want to move too much beyond these regions. But if you would like to be a researcher, I'll humbly share my opinions on what works best.

So, to the best of my knowledge, what can you do to improve your understanding of the ongoing research and why things work and fail are:

- **Read papers:**
  - Reading papers is a must in deep learning. You'll get the freshest insights and methods that aren't in your textbooks yet. You will get to see the edge of what humanity has to offer! Plus, you'll sharpen your critical thinking and maybe even spark some wild ideas of your own.
  - I find article reading videos to be helpful as well. There are people on YouTube that reads and explains good (generally) research papers. These may be a good starting point for you (see resources).
  - Key publishers, research groups, conferences, and journals in deep learning:
    - Publishers: MIT Press, Springer, O'Reilly Media
    - Research Groups: Google AI, OpenAI, DeepMind, Facebook AI Research (FAIR), Microsoft Research
    - Conferences: NeurIPS, ICML, ICLR, CVPR, ACL
    - Journals: Journal of Machine Learning Research (JMLR), IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI), Artificial Intelligence (AIJ)
- **Read the source code, GitHub repos and documentation:**
  - Do not be afraid to get your hands dirty. Read the source codes of the researches that you find interesting. It's a hands-on way to see how all those theoretical concepts actually come to life in code. By poking around, you'll pick up on clever optimization tricks, figure out why certain architectures work better, and learn some slick coding moves from the pros in the field.
- **Do not give up until you truly grasp:**
  - Listen, this is not gonna be easy. You'll hit walls, feel stupid, and want to quit. But that's where the magic happens! Keep banging your head against those concepts until they crack open. Ask dumb questions to LLMs, bug your peers, watch a million YouTube videos if you have to. Whatever it takes to make it click. Because once it does, you'll be unstoppable. Remember, even the AI geniuses started as clueless newbies. So embrace the struggle.
  - Try to understand "WHY" something is working, to me this is the most critical question. You can memorize 'WHAT' something is or 'HOW' that thing works but not 'WHY' it works without truly grasping the concepts.

Start by thoroughly understanding the mathematics behind deep learning. This includes advanced topics in linear algebra, calculus, and probability theory. A solid mathematical foundation will enable you to grasp complex concepts and contribute to developing new architectures.

Explore advanced architectures and techniques such as:

1. **Transformer models:** These attention-based architectures have revolutionized natural language processing. Understand the self-attention mechanism and how it enables these models to capture long-range dependencies in sequential data.
2. **Graph Neural Networks (GNNs):** These models are designed to work with graph-structured data, making them valuable for tasks involving social networks, molecular structures, or any data with inherent relational information.
3. **Capsule Networks:** Inspired by the human visual system, these networks aim to capture hierarchical relationships within data, potentially offering improved robustness and interpretability compared to traditional CNNs.
4. **Neuro-symbolic AI:** This emerging field combines neural networks with symbolic reasoning, aiming to create AI systems that can perform both pattern recognition and logical reasoning.
5. **Meta-learning:** Also known as "learning to learn," this approach involves training models that can quickly adapt to new tasks with minimal data, a crucial step towards more flexible AI systems.

Stay updated with the latest research by regularly reading papers from top conferences like [NeurIPS](https://neurips.cc/), [ICML](https://icml.cc/), and [ICLR](https://iclr.cc/). Implement these cutting-edge models and contribute to open-source projects to gain practical experience with state-of-the-art techniques.

As you master deep learning, focus on understanding the trade-offs between different architectures and when to apply each one. Develop the ability to design custom architectures for specific tasks, considering factors like computational efficiency, interpretability, and performance.

Ultimately, mastering deep learning is an exciting journey that never really ends. The field is always evolving, with fresh architectures and techniques popping up all the time. Keep that sense of curiosity alive, embrace continuous learning, and feel free to explore those unconventional ideas. Who knows? Your unique perspective and experiments might just lead to the next big breakthrough in deep learning ;)

Here are some resources to make your life easier:

**Paper Reviews:**
- [Gabriel Mongaras (YouTube)](https://www.youtube.com/@gabrielmongaras)
- [Yannic Kilcher (YouTube)](https://www.youtube.com/@YannicKilcher)
- [Sasha Rush (YouTube)](https://www.youtube.com/@srush_nlp)
- [Two Minute Papers (YouTube)](https://www.youtube.com/@TwoMinutePapers)
- [Samuel Albanie (YouTube)](https://www.youtube.com/@SamuelAlbanie1)

**Hidden Gems:**
- [Emergent Garden (YouTube)](https://www.youtube.com/@EmergentGarden)
- [Outlier (YouTube)](https://www.youtube.com/@outliier)
- [Efficient NLP (YouTube)](https://www.youtube.com/@EfficientNLP)
- [Mutual Information (YouTube)](https://www.youtube.com/@Mutual_Information)
- [Rational Animations (YouTube)](https://www.youtube.com/@RationalAnimations)
- [Artem Kirsanov (YouTube)](https://www.youtube.com/@ArtemKirsanov)

**Additional Resources:**
- [Welch Labs (YouTube)](https://www.youtube.com/@WelchLabsVideo)
- [Computerphile (YouTube)](https://www.youtube.com/@Computerphile)
- [Visually Explained (YouTube)](https://www.youtube.com/@VisuallyExplained)
- [Andrej Karpathy (YouTube)](https://www.youtube.com/@AndrejKarpathy)

**Blogs & Classes:**
- [Anthropic Research](https://www.anthropic.com/research) (publications are really good)
- [Transformer Circuits](https://transformer-circuits.pub/)
- [Distill - Circuits: Zoom In](https://distill.pub/2020/circuits/zoom-in/)
- [Rycolab ACL 2023 Tutorial](https://rycolab.io/classes/acl-2023-tutorial/)
- [Rycolab LLM Course](https://rycolab.io/classes/llm-s24/)

**Newsletters:**
- [TLDR Data](https://tldr.tech/data)
- [TLDR AI](https://tldr.tech/ai)
- [Alpha Signal](https://alphasignal.ai/)

Remember: no resource is better teacher than your own effort.

## Computer Vision

Computer vision is one of the most exciting and tangible areas in AI — you get to build systems that can *see*. Unlike NLP where the data is abstract text, here the inputs and outputs are visual, which makes both the successes and failures immediately intuitive.

Start with **classical computer vision** before diving into deep learning approaches. Understanding image filtering, edge detection (Canny, Sobel), feature extraction (SIFT, HOG), and geometric transformations gives you the vocabulary to understand what neural networks are actually learning. OpenCV is your best friend here — it's been the backbone of CV for decades and remains essential for preprocessing, data augmentation, and deployment.

Once you have the classical foundation, move into **deep learning for vision**. You've already encountered CNNs in the deep learning section, but here's where you go deeper:

- **Image Classification:** The "hello world" of CV. Start with ResNet, understand skip connections and why they matter. Then explore EfficientNet and how architecture search changed the game.
- **Object Detection:** Understand the evolution from R-CNN (slow, two-stage) to YOLO (fast, single-stage). The YOLO family (especially Ultralytics' implementations) is incredibly practical — you can have a working detector in minutes. But understand *why* anchor boxes work, what non-max suppression does, and the trade-offs between speed and accuracy.
- **Semantic & Instance Segmentation:** Pixel-level understanding. U-Net for medical imaging, Mask R-CNN for instance segmentation. Understanding how feature pyramid networks (FPN) enable multi-scale detection is key.
- **Vision Transformers (ViT):** The transformer invasion reached vision too. ViTs split images into patches and treat them as tokens. Understanding why this works (and when CNNs still win) is important. Look into DINOv2 and SAM (Segment Anything) for the state of the art.
- **Generative Models for Vision:** GANs were covered in the DL section, but here's where diffusion models shine. Understanding the denoising process and how models like Stable Diffusion generate images from text is both fascinating and increasingly practical.
- **Multimodal Models:** CLIP connected vision and language in a way that changed the field. Understanding contrastive learning and how vision-language models work opens the door to modern applications like image search, zero-shot classification, and visual question answering.

A practical note: CV projects are extremely rewarding because the results are *visual*. Build things you can show — a real-time object detector on your webcam, a style transfer app, a medical image classifier. These projects are not only great for learning but also make excellent portfolio pieces.

Here are some resources to make your life easier:

- [Stanford CS231n: Deep Learning for Computer Vision](http://cs231n.stanford.edu/) - THE foundational course
- [First Principles of Computer Vision (YouTube)](https://www.youtube.com/channel/UCf0WB91t8Ky6AuYcQV0CcLw) - excellent channel for classical CV
- [OpenCV Documentation & Tutorials](https://docs.opencv.org/)
- [Ultralytics (YOLO)](https://docs.ultralytics.com/) - practical object detection
- [PyImageSearch](https://pyimagesearch.com/) - hands-on tutorials
- [Papers with Code - Computer Vision](https://paperswithcode.com/area/computer-vision) - benchmarks and state of the art
- [Hugging Face Vision Models](https://huggingface.co/models?pipeline_tag=image-classification)

Remember: no resource is better teacher than your own effort.

## Natural Language Processing

NLP is where some of the most dramatic progress in AI has happened. To truly understand modern NLP, you need to understand the journey — not just where we are, but how we got here and *why* the shifts happened.

Start with the **foundations**: tokenization, stemming, lemmatization, bag-of-words, TF-IDF. These may seem old-fashioned, but they teach you how to think about text as data. Understanding word embeddings (Word2Vec, GloVe) is crucial — the idea that words can be represented as dense vectors where semantic relationships are captured geometrically ("king - man + woman = queen") was a paradigm shift.

Then comes the most important architectural transition in modern AI: **the shift from recurrent models to transformers**. Understanding *why* this happened is more important than memorizing architectures:

- **RNNs and LSTMs** process sequences one token at a time, left to right. This sequential nature means they can't be parallelized effectively, and they struggle with long-range dependencies despite gating mechanisms. Training is slow and scaling is painful.
- **Transformers** replaced this with the self-attention mechanism, which lets every token attend to every other token *simultaneously*. This is the key insight: **parallelism**. Transformers can process entire sequences at once on GPUs, which means they scale with hardware. This isn't just an engineering convenience — it fundamentally changed what's possible. The ability to train on massive datasets efficiently is what gave birth to LLMs.

Understanding **what exactly LLMs are learning** is critical. They are not databases of facts. They are not search engines. At their core, they are next-token predictors trained on massive amounts of text. But through this simple objective, they develop internal representations that capture syntax, semantics, reasoning patterns, world knowledge, and even something that resembles understanding. The debate about whether this constitutes "real" understanding is fascinating and ongoing — but what's undeniable is that the representations they learn are remarkably rich. Studying mechanistic interpretability (how individual neurons and circuits implement specific behaviors) will give you deeper insight into what's actually happening inside these models.

The modern NLP landscape is built on this foundation:

- **BERT and encoder models:** Bidirectional understanding, great for classification, NER, and understanding tasks. Pre-train once, fine-tune for everything.
- **GPT and decoder models:** Autoregressive generation. The foundation of modern chatbots and code assistants.
- **Sequence-to-sequence models (T5, BART):** Encoder-decoder architectures for translation, summarization, and other transformation tasks.
- **Fine-tuning and RLHF:** How raw language models become useful assistants. Understanding instruction tuning and alignment is increasingly important.
- **RAG (Retrieval-Augmented Generation):** Combining LLMs with external knowledge retrieval to reduce hallucination and stay up-to-date.

For practical NLP work, the essential tools are:

- **Hugging Face Transformers:** The de facto library for working with pre-trained models. Learn to fine-tune, do inference, and explore the model hub.
- **spaCy:** Production-ready NLP with great tokenization, NER, and dependency parsing. Fast and practical.
- **NLTK:** The classic library for learning NLP fundamentals. Great for understanding tokenization, POS tagging, and parsing from first principles.
- **Zemberek:** Essential for Turkish NLP — morphological analysis, tokenization, and spell-checking for Turkish text. Turkish is an agglutinative language, which means standard English-centric NLP tools often fail on it. Zemberek fills this gap.

Here are some resources to make your life easier:

- [Stanford CS224N: NLP with Deep Learning](http://web.stanford.edu/class/cs224n/) - THE NLP course
- [Hugging Face NLP Course](https://huggingface.co/learn/nlp-course) - hands-on and free
- [Speech and Language Processing (Jurafsky & Martin)](https://web.stanford.edu/~jurafsky/slp3/) - the NLP textbook, free online
- [The Illustrated Transformer (Jay Alammar)](https://jalammar.github.io/illustrated-transformer/) - best visual explanation of transformers
- [Andrej Karpathy - Let's build GPT (YouTube)](https://www.youtube.com/watch?v=kCc8FmEb1nY) - build a transformer from scratch
- [Attention Is All You Need (original paper)](https://arxiv.org/abs/1706.03762) - read this, understand this
- [Zemberek NLP](https://github.com/ahmetaa/zemberek-nlp) - Turkish NLP toolkit

Remember: no resource is better teacher than your own effort.

## Data Engineering

Data engineering is the unsexy but absolutely critical foundation that everything else in AI runs on. You can have the most brilliant model architecture in the world, but if your data pipeline is broken, your features are stale, or your training data is garbage — none of it matters. As the saying goes: **garbage in, garbage out**.

If machine learning is the engine, data engineering is the fuel system, the roads, and the gas stations. Here's how to approach it:

**Start with SQL.** This is non-negotiable. SQL has been around for decades and it's not going anywhere. Master it — not just SELECT and WHERE, but window functions, CTEs, query optimization, and understanding execution plans. You'll use SQL every single day, whether you're an ML engineer, data scientist, or data engineer. Most of the "data work" in the real world is SQL, not Python.

**Understand data modeling and storage:**
- Learn the difference between OLTP (transactional) and OLAP (analytical) databases and when to use each.
- Understand data warehousing concepts: star schemas, snowflake schemas, slowly changing dimensions.
- Get familiar with different storage formats: Parquet (columnar, compressed, fast), CSV (simple, ubiquitous, slow), JSON (flexible, nested), and when each is appropriate.
- Learn about data lakes vs data warehouses vs data lakehouses and the trade-offs between them.

**Learn to build data pipelines:**
- **ETL vs ELT:** The classic debate. ETL (Extract, Transform, Load) transforms data before loading. ELT (Extract, Load, Transform) loads raw data first and transforms in the warehouse. Modern data stacks lean towards ELT because cloud warehouses are powerful enough to handle transformations.
- **Orchestration:** Apache Airflow is the standard for scheduling and managing data pipelines. Understand DAGs (directed acyclic graphs), task dependencies, and how to handle failures and retries.
- **Batch vs Streaming:** Most data work is batch processing (process data in chunks, e.g., daily). But some applications need real-time data — that's where streaming comes in. Apache Kafka for event streaming and Apache Spark Structured Streaming or Flink for stream processing are the go-to tools.

**Cloud platforms are essential:**
- Pick one (AWS, GCP, or Azure) and learn it well. The concepts transfer across platforms. Learn about object storage (S3/GCS), managed databases (RDS, BigQuery, Redshift), and serverless compute.
- Infrastructure as code (Terraform) and containerization (Docker) are increasingly expected skills.

**Data quality and observability:**
- Data testing (Great Expectations, dbt tests) ensures your data is correct before it reaches models.
- Data lineage — knowing where your data came from and how it was transformed — is critical for debugging and compliance.
- Monitoring data pipelines is just as important as monitoring ML models.

**The modern data stack** to be familiar with:
- **dbt (data build tool):** SQL-based transformations with version control, testing, and documentation. This has become the standard for analytics engineering.
- **Apache Spark:** Distributed data processing for large-scale datasets. PySpark lets you use Python.
- **Apache Kafka:** Event streaming platform for real-time data pipelines.
- **Apache Airflow:** Workflow orchestration and scheduling.

A practical note: data engineering is one of the most in-demand roles in tech, and it pays well. Even if your goal is to be an ML researcher, understanding data engineering will make you significantly more effective. The best ML engineers I know are the ones who can own the entire pipeline — from raw data ingestion to model serving.

Here are some resources to make your life easier:

- [Fundamentals of Data Engineering (Joe Reis & Matt Housley)](https://www.oreilly.com/library/view/fundamentals-of-data/9781098108298/) - THE data engineering book
- [DataTalksClub Data Engineering Zoomcamp](https://github.com/DataTalksClub/data-engineering-zoomcamp) - free, hands-on course
- [Seattle Data Guy (YouTube)](https://www.youtube.com/@SeattleDataGuy) - practical data engineering content
- [Designing Data-Intensive Applications (Martin Kleppmann)](https://dataintensive.net/) - the bible of distributed systems and data
- [Mode SQL Tutorial](https://mode.com/sql-tutorial) - excellent interactive SQL learning
- [dbt Documentation & Tutorial](https://docs.getdbt.com/docs/introduction)
- [Apache Airflow Documentation](https://airflow.apache.org/docs/)
- [Start Data Engineering (Blog)](https://www.startdataengineering.com/)

Remember: no resource is better teacher than your own effort.

---

# Beyond Learning

What you read up to now (if you did not skip) might make you think that I'm a nerd (and I'm) that only studies on the area that he's interested and does nothing else (not true).

Please be aware that **your life is more than its components**. Your job is an extremely important component for sure, but it will not be the only thing. Try to spare some time to drink a cup of coffee just to enjoy the taste of it, and hang out with your friends just to engage with them. Have hobbies (mine is coffee, cinema and books <3) and engage in physical activities. I know these may seem like generic recommendations but I find them valuable. University can be tough, I see people either focusing too much on their studies or not studying at all.

I know it is hard to keep the balance, but there are resources and ways to make your life easier in your studies. In this page, I tried to help you keep this balance by providing insights and guiding you towards resources.

I hope I could be helpful :)
