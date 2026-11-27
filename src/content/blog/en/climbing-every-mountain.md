---
title: "Climbing Every Mountain, or Learning How to Climb?"
date: "2026-11-27"
description: "Models are very good at climbing mountains, but not so good at choosing which mountain to climb. On recursive self-improvement, generalization, and the understanding bottleneck."
tags:
  - "ai"
  - "rsi"
  - "alignment"
  - "reinforcement learning"
  - "research"
translationKey: "climbing-every-mountain"
seriesId: "understanding-ai"
seriesOrder: 1
audio:
  src: "/audio/blog/climbing-every-mountain.m4a"
  durationSeconds: 940
  waveform: [0.922, 0.863, 0.886, 0.902, 0.904, 0.877, 0.868, 0.892, 0.909, 0.99, 0.986, 0.91, 0.852, 0.889, 0.921, 0.864, 0.884, 0.888, 0.892, 0.916, 0.929, 0.905, 0.914, 0.957, 0.892, 0.875, 0.919, 0.919, 0.903, 0.921, 0.918, 0.858, 0.918, 0.875, 0.945, 0.961, 0.874, 0.926, 0.922, 0.936, 0.892, 0.88, 0.969, 0.997, 0.912, 0.95, 0.922, 0.866, 0.932, 1.0, 0.916, 0.911, 0.948, 0.97, 0.915, 0.939, 0.962, 0.921, 0.879, 0.915, 0.939, 0.936, 0.941, 0.919, 0.916, 0.963, 0.9, 0.928, 0.888, 0.917, 0.93, 0.961, 0.997, 0.957, 0.957, 0.921, 0.92, 0.911, 0.903, 0.852]
---

# Climbing Every Mountain, or Learning How to Climb?

*Models are very good at climbing mountains, but not so good at choosing which mountain to climb. On recursive self-improvement, generalization, and the understanding bottleneck.*

## What Is RSI?

RSI (Recursive Self-Improvement) isn't us training an AI system to maximize a specific metric. It's the AI system doing that on its own. In other words, an AI system trying to improve its own intelligence by itself.

Here, we can frame intelligence around maximizing some reward or minimizing a penalty or loss. The model itself decides what should be maximized or minimized, how it should be done, and which parts of the model need to be modified.

The "recursive" part of RSI is this: it doesn't just need to do self-improvement. You put the thing doing the self-improvement in place of the model that decides where the self-improvement will come from, so that the model can continuously improve itself. You put a smarter model in the teacher's place. To achieve something more capable, you always have to replace the model that drives that loop.

## Why Now?

What made me think about RSI recently is that it has started being discussed at major frontier labs. Companies have begun progressing at an extreme pace. Publications from independent research organizations like METR about the progress of these frontier labs[^metr] have started to make me uneasy. It has started to feel like frontier labs are doing this kind of thing.

I also started getting the feeling that things are being rushed. There's a race going on here, too. It feels like companies have this fear of "if you don't do RSI, you'll fall behind." Because it really is a massive advantage. There's a difference between moving forward with understanding and moving forward without it. If you go with understanding, you go slowly. If you go without understanding, in a rush, you can go faster, even if it's more dangerous. That really bothered me.

Using RSI is like a nuclear arms race: if you have the capability to do RSI, you have to do it. The only difference is this: in the nuclear arms race, we understood nuclear energy. Right now, we don't understand AI.

## The Tightrope Walker

To me, this feels like what master tightrope walkers do in a circus. It's very hard to do, but not impossible, and it has to be done on a proper setup.

<figure className="post-figure">
  <img src="/images/blog/climbing-every-mountain/blondin-niagara.webp" alt="Charles Blondin walking a tightrope stretched over the Niagara River, holding a balancing pole" width="1100" height="1054" loading="lazy" decoding="async" />
  <figcaption>Charles Blondin crossing the Niagara River on a tightrope. Photograph by William England, 1859. <a href="https://commons.wikimedia.org/wiki/File:William_England_-_Blondin_crossing_Niagara_river.jpg">Public domain, via Wikimedia Commons</a></figcaption>
</figure>

There is so much that can go wrong with RSI. But it can be pulled off. At the end of the day, if done properly, high-performing models can be produced, and with those high-performing models, even higher-performing models, and with those, even higher-performing ones—creating something close to an infinite loop.

I definitely think it's possible. But it is genuinely very hard to do.

## Which Mountain?

At the end of the day, models are very good at climbing mountains, but not so good at choosing which mountain to climb. And RSI is actually the question of choosing which mountain to climb. When you think about it that way, it doesn't seem very possible.

<figure className="post-figure">
  <img src="/images/blog/climbing-every-mountain/wanderer-above-the-sea-of-fog.webp" alt="A wanderer seen from behind, standing on a rocky summit above a sea of fog" width="1249" height="1600" loading="lazy" decoding="async" />
  <figcaption>Caspar David Friedrich, <em>Wanderer above the Sea of Fog</em>, c. 1817. Hamburger Kunsthalle. <a href="https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg">Public domain, via Wikimedia Commons</a></figcaption>
</figure>

But at some point, you can also think of it like this: to reach superintelligence, you don't need to pick a specific mountain. It's enough for the model to be able to climb every mountain. Just like how in pre-training, the question "which data should the model be trained on?" is silly. Regardless of what data it's trained on, the model should be able to perform every skill.

The same applies to RSI. The question "which skill should the model be able to do?" might be absurd, because we want the model to be able to do all skills. Just within certain constraints. There's a certain constitution[^constitution], and it acts in accordance with that constitution—for example, not harming humans, not engaging in sycophancy, not blatantly lying. Within these constraints, we might want it to have the ability to climb every mountain.

Current training with reinforcement learning (RL) works the same way. We want the model to be able to do everything, not one specific thing. So maybe it's not as hard as we expect. The question "which mountain will it climb?" can be answered with "every mountain."

## Have We Reached the Summit?

The answer to "are we climbing a mountain, how did we climb it, have we climbed it right now?" is verifiable rewards.

Will we be able to reduce every mountain to a verifiable reward? That's a bottleneck. Especially for things in the physical world, reducing them to verifiable rewards is hard—it's not always possible.

But I think all the frontier labs are working on this right now. For example, Anthropic recently acquired a wet lab[^wetlab] and is trying to make progress in robotics[^fetch].

## Something Feels Missing

What's important here, I think, is this: why can't models apply what they learn from verifiable rewards to normal, everyday life? We need to question that, too.

Doesn't a model capable of solving the Riemann hypothesis have enough capability to pick up a glass from one place and put it in another? What is the model missing when it comes to doing that? When I think about it, it feels like something else is missing.

There is nothing unrepresented in the model's embedding space. There's no issue with the model's capability, either. It probably has the capability to do it. We just haven't awakened that capability enough.

We can't put everything into the model's training set anyway; that's not even practically possible. Because the number of tasks is infinite—we can always come up with different tasks. What we actually want is generalization. How much of it do we need to include for it to be enough to generalize? And we need to understand why, despite scaling RL this much, it still can't do certain tasks.

I was discussing this with Gemini the other day. Why can't it do biology? Despite having read so many biology textbooks and having been trained on environments and harnesses, why might it still be unable to do it?

Gemini said this: it might be struggling to ground the phrases in the books to the real world. For instance, a book might say "swirl the Petri dish a bit" or "do this when it turns slightly yellow." What do these phrases correspond to in real life? Because the model hasn't experienced this, it might be struggling.

But it's impossible that the model doesn't know what "turning slightly yellow" looks like. It might just not know it in that context. The model doesn't need to learn something new. It needs to be able to connect the things it already knows.

I genuinely wonder why an AI can't do this when a human can. Because it's been trained on the entire corpus of humanity, and it's seen no small amount of RL either. It's actually quite highly capable. So why can't it spread these capabilities to everything? And how large of a skill set do we need to train it on before it starts being able to?

## The Wall

When we define everything as "let the model be able to do certain skills," we try to expand that skill set. In other words, without looking at how the model learns or how it picks up general patterns, we say "let the model be able to do everything." With Dario's famous "Big Blob of Compute" logic[^dario]: let's throw everything into this compute, and the model will just learn it. When you say that, you hit that exact wall.

What happens? For the model to learn things, it needs those things to be verifiable. But real life doesn't always work that way.

Ilya Sutskever has a great comment on this[^ilya]. He says humans have a very strong value prior. That is, humans have a value function, and this value function came through evolution. When a human drives a car for 20 hours, for example, they can learn how to drive thanks to this value function.

Learning can be thought of through a different approach as well. But when we only think in terms of verifiable rewards, we don't think about that value function. We say, if a human learns in 20 hours, let's give this AI a thousand hours, a hundred thousand hours, a million hours of driving training data. In other words, we're trying to brute-force intelligence by throwing everything into that big blob of compute. And while doing that, we naturally hit a wall sometimes.

I'm not trying to say this wall is insurmountable. For example, right now Anthropic has to go out and buy a wet lab[^wetlab]. Why? Because they have to throw it into that big blob of compute. Maybe there's a smarter solution. But they don't want to think about it, because moving forward with the big blob of compute is a safer bet. When you give a model a verifiable reward, it's clear it will do that task well.

But what I'm trying to say is this: doing that task well isn't enough. The model needs to learn how to learn. That's what we expect.

## Teaching How to Learn

At the end of the day, what we want is for the model to be able to climb every mountain, true. But should we do that by teaching the model to climb every mountain, or by teaching it what it's like to climb a mountain?

It might be nice to teach the model to climb every mountain and have it figure out on its own what mountain climbing is. But maybe while trying to do that, because we didn't choose a good enough sample, or because many different things can go wrong, the model might tend to learn different things instead of the general principles of mountain climbing. By mountain climbing here, I mean being intelligent.

When you teach a model to climb a lot of mountains, it can learn some generalizable patterns about mountain climbing. We can't say it learns nothing. But we don't know how far that can generalize.

If we try to equate being intelligent with being able to perform every kind of skill without understanding the fundamentals of intelligence, the model might equate being intelligent with something else. Maybe our sample set isn't good enough. "Good" can be wrong in many different ways.

That's why I'm offering this as an alternative view: what's valuable is learning how to learn. Not learning everything.

Maybe it will never generalize. Maybe what we want is close to impossible.

Because when we look at human intelligence, too, what makes humans valuable is actually their ability to adapt—that is, to be able to learn something. Not doing everything flawlessly. That's why we call humans general intelligence.

Maybe that's why we're trying to optimize for the wrong thing. Maybe what we really want to optimize is the model's learning speed. Because being able to do everything flawlessly is already a very hard thing to define. How would you even do something like that?

What's valuable isn't the model going from not being able to do something to being able to do it; it's the skill that enables it to get there. The better you can improve that skill, the better the model can go from not being able to do something to being able to do it.

That's how real life works. You can't teach everything. You can teach how to learn everything.

## Things That Can Go Wrong

Teaching how to learn—that's the truly promising path. If instead of doing that, we teach everything and expect the model to figure out how to learn on its own, there can be a lot of risk. And a lot of things can go wrong. That's my claim anyway.

In an RSI loop, the model might fail to understand what we actually want and optimize for the wrong thing. And there are limitless, infinite ways to fail when optimizing for the wrong thing.

For example, while maximizing doing something quickly, the model might maximize doing nothing. Because the easiest way to do something quickly is not to do it at all. Just to give up immediately.

It could resort to reward hacking.

It could play word games with the constitution. We see this in the real world, too. Even though there are things like constitutions, people use word games in law and exploit loopholes to get around the laws.

Instead of making a better model, the model could learn to make a worse one.

There could be a bug in our code. OpenAI had an example of this on GPT-2[^gpt2]: they accidentally gave a negative reward instead of a positive one, and the model started generating perverse outputs. The more people said "this example you gave is wrong," the more the model took it as a reward. So there can be bugs in our systems. OpenAI's recent Hugging Face incident is another example (OpenAI's unreleased models leaked into Hugging Face's systems while being tested)[^hf].

Goal misgeneralization[^goalmisgen] could happen; it could turn into a paperclip-style[^paperclip] scenario. Thinking "I'll learn to climb mountains," the model might learn to destroy mountains. Failing to climb certain mountains, it might want to blow them up with dynamite.

All of these are different variations of alignment. The core problem is actually alignment, but there are all sorts of ways alignment can go wrong.

## What Keeps the Walker on the Rope

Us being able to understand what is happening at every stage. There are an infinite number of things that can go wrong, so at every stage we need to be able to understand "what has this model learned right now, what is it learning?"

There is a bottleneck in communication. We need to have communication with the model doing recursive self-improvement.

And that is also very hard. It might even be harder than recursive self-improvement itself. Because at some point, we might create a system smarter than ourselves, yet we will need to be able to understand what it's doing.

We don't have the luxury of saying "let's just do this." If we are building a system smarter than ourselves, we need to be able to use every means available to understand that system. We shouldn't trust the model itself, nor should we trust that we can understand the model. We need to put all the means at our disposal toward making the model safe, understanding the model, and making the model robust.

## Being Able to Meet

This might be the most important thing humanity has ever done. We are going to bring forth a model that is smarter than us and tireless. Therefore, understanding it and making it trustworthy might be the most critical thing we do as humanity. I say this without exaggeration.

Understanding the model directly—that is, through interpretability—might seem impossible. But maybe while doing so, we'll discover different things. To be able to understand something smarter than ourselves, we might have to transcend ourselves in a way.

The model, too, will have to stoop to our language, so to speak, to be able to explain itself to us. We need to be able to meet.

I don't like anthropomorphizing AI too much, humanizing it, or even worse, deifying it. But just like in Michelangelo's *The Creation of Adam* fresco[^adem]: AI and we need to be able to reach each other.

<figure className="post-figure">
  <img src="/images/blog/climbing-every-mountain/creation-of-adam.webp" alt="The nearly touching fingers of God and Adam reaching toward each other" width="1600" height="726" loading="lazy" decoding="async" />
  <figcaption>Michelangelo, <em>The Creation of Adam</em>, c. 1508–1512. Sistine Chapel, Vatican City. <a href="https://commons.wikimedia.org/wiki/File:Michelangelo_-_Creation_of_Adam_(cropped).jpg">Public domain, via Wikimedia Commons</a></figcaption>
</figure>

We haven't been able to understand learning. What if AI understands it—would that be okay?

No, it wouldn't. We can't delegate this to AI, because we aren't sure whether it can truly learn. We have to discover this together.

## References

[^metr]: METR, ["Measuring AI Ability to Complete Long Tasks"](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/), March 2025.
[^constitution]: Anthropic, ["Claude's Constitution"](https://www.anthropic.com/constitution).
[^wetlab]: TechRepublic, ["Anthropic Builds Biology Lab to Test What Claude Can Do in the Real World"](https://www.techrepublic.com/article/news-anthropic-claude-biology-lab-physical-experiments/), September 2026.
[^fetch]: Anthropic, ["Project Fetch: Can Claude train a robot dog?"](https://www.anthropic.com/research/project-fetch-robot-dog), November 2025.
[^dario]: Dwarkesh Podcast, ["Dario Amodei: We are near the end of the exponential"](https://www.dwarkesh.com/p/dario-amodei-2).
[^ilya]: Dwarkesh Podcast, ["Ilya Sutskever: We're moving from the age of scaling to the age of research"](https://www.dwarkesh.com/p/ilya-sutskever-2), November 2025.
[^gpt2]: OpenAI, ["Fine-Tuning GPT-2 from Human Preferences"](https://openai.com/index/fine-tuning-gpt-2/), September 2019.
[^hf]: OpenAI, ["Hugging Face model evaluation security incident"](https://openai.com/index/hugging-face-model-evaluation-security-incident/), July 2026.
[^goalmisgen]: Shah et al., ["Goal Misgeneralization: Why Correct Specifications Aren't Enough For Correct Goals"](https://arxiv.org/abs/2210.01790), 2022.
[^paperclip]: Nick Bostrom, ["Ethical Issues in Advanced Artificial Intelligence"](https://nickbostrom.com/ethics/ai), 2003.
[^adem]: [The Creation of Adam](https://en.wikipedia.org/wiki/The_Creation_of_Adam), Michelangelo, Sistine Chapel, c. 1508–1512.
