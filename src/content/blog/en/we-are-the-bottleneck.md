---
title: "We Are the Bottleneck"
date: "2026-11-16"
description: "At some point while working with AI, I started looking for the problems in myself. When it comes to research, though, things get a little more complicated."
tags:
  - "ai"
  - "agents"
  - "research"
  - "reinforcement learning"
translationKey: "we-are-the-bottleneck"
seriesId: "ai-programming"
seriesOrder: 4
---

# We Are the Bottleneck

*At some point while working with AI, I started looking for the problems in myself. When it comes to research, though, things get a little more complicated.*

In my earlier posts, I talked about how AI agents can do better work than we can when we give them the context they need. As I've kept using these tools since then, one thought keeps getting louder in my head: I think we're the bottleneck now.

Well, let me speak for myself at least. I'm quite a bottleneck.

I can't keep up with AI agents. I don't know everything they know, and I can't research and learn what they don't know as quickly as they can. I don't have the same grasp of all the code they produce. Sometimes I don't even read their entire response (I don't have the reading speed, or sometimes the expertise to understand it). Then, when something doesn't turn out the way I wanted, I get annoyed at the model. But once we dig into the conversation a bit, I realize I never said half of what I thought I had in mind.

Turns out I didn't really know the other half myself :)

But is that the whole story? If we learn more, speak more clearly, and read and understand every output, does the problem go away?

In engineering, that's largely been my experience. (In research, the same approach doesn't hold up. I'll get to that later in the post.)

## I Can't Keep Up

I rarely get stuck doing engineering with AI anymore. If something doesn't work, we talk about why. If I don't understand the explanation, I ask for a simpler one. And once I understand, sometimes I realize I hadn't even described the problem properly. We fix that and keep going. Sometimes it takes a few rounds, but we get somewhere in the end.

This loop works so well that when I see a bad output now, I've started looking at myself before getting annoyed at the model. Did I actually say what I wanted? Did I give it the context it needed? Did I read its response, and if so, did I understand it? Or do I not really know what I'm asking the model to do either?

That last one is a bit annoying. Because noticing what you don't know isn't easy either. If you don't know what's possible in a field, that shapes what you ask AI for. Maybe there's something it could do quite easily, but you never ask because it never occurs to you that it could be done. You end up limiting some of the capability you have access to with your own knowledge, before the conversation even starts. A shame.

Then there's keeping up with the things you do know. The model changes the code, explains why, and moves on to the next step. Meanwhile, you're still trying to understand the previous change. Or you skim the explanation and think you've got the general idea, but you've missed an important detail. Then more decisions get built on top of that detail.

Little by little, the project in your head and the actual state of the code drift apart. AI doesn't know where it lost you. It may assume you've read what it wrote, understood it, and are continuing from the same place. But you're still a few steps behind. Once again, it's up to you to notice and explain that.

In “Prompt Is Not Enough,” I talked about how intent and instructions aren't the same thing. Well, I'm creating some of that gap myself here. I leave things out when I explain what I want, miss part of the response, and then expect the result I had in my head. How is the model supposed to know what's in my head? All it has is what I told it, and it's doing that quite successfully. If I asked for the wrong thing, it's successfully doing the wrong thing. (Good for it)

Then we ask ourselves:

> With this much intelligence, how did we do something this stupid?

Because we didn't communicate what mattered properly. Sometimes we didn't understand it ourselves.

Looking at it up to this point, “let's improve ourselves first” makes perfect sense. Let's learn more, understand what we want, and communicate better. I agree with all of that.

But that's an engineer's mindset. Let's look at it through a scientist's eyes for a bit.

## I'm Still Trying to Figure Out What I Want

In research, sometimes I don't know what I want.

Something catches my attention. A result seems strange, like it shouldn't be that way. An explanation doesn't sit right with me. I don't have a proper argument yet, but I feel there's something right there, exactly there, worth spending time on. I want to talk. Poke at it a bit, look at it from somewhere else, maybe find out that my idea is nonsense. Sometimes even finding that out can be part of the bigger picture in research.

I go to AI, and out comes a plan.

Let's review the literature. Then clarify our objective. Next, define the success criteria. After that, generate three alternatives and compare them. Which option would you prefer? Here are the trade-offs.

Okay, but I haven't even figured out what I think yet.

This is exactly what happened while I was preparing this post. I said, “I feel like we're the bottleneck now.” We talked a bit, and then, to develop my thinking, I asked, “Could you challenge me a bit more?”

I got a list of five questions.

Each question made sense on its own. But together, they made me feel like I was filling out a form rather than thinking. I had to choose the scope of my claim, decide how strongly I stood behind it, find a counterexample, and so on. As if the thought was already complete in my head and I just had to fill in the fields AI needed to process it properly. As if... I was part of an optimization.

So instead of answering the questions, I explained why this bothered me and why it wasn't part of the thinking process I wanted.

And that's where the real conversation started.

## Can't We Leave It Uncertain for a Bit?

There's nothing wrong with wanting clarity. Don't get me wrong, I'm not saying our thoughts should stay scattered forever and we should never get anywhere. But AI has such an appetite for clarity that sometimes it tries to pin a thought down before it has even formed.

It wants to turn everything into a task. Let's produce an output, make a decision, put together a plan. Come on, let's get somewhere already!

Sometimes I want to stay there a little longer. Because I haven't figured out what I think yet. Do we have to get somewhere right away?

Something I thought mattered at the start loses its importance as we talk. A tangent opens up, and we end up somewhere more interesting than the original question. I start disagreeing with something I said myself. These are perfectly normal parts of thinking. They're part of why I'm having the conversation in the first place. I don't just want an idea that's already in my head put into proper sentences.

AI, meanwhile, expects me to find the question first, explain why it matters, and decide how we'll evaluate it. Once I've sorted those things out, it'll be very helpful. But by the time I get there, it's handed a significant part of the work back to me.

Well, if I'm going to do all of that myself, haven't I already done a significant part of the research?

## Problem-Solving Monsters

I think this has something to do with training. Especially RL. Here's my hypothesis: as we keep training agents to succeed at specific tasks, we're also reinforcing their tendency to see everything as a task that needs completing.

Give it the problem. Produce the solution. Evaluate the result. Do better.

And they really do it very well. I see it in math, in code, in engineering work I can describe properly. These systems have turned into outright problem-solving monsters. I have no complaints about that. In fact, it's the whole starting point of this post.

But real life isn't entirely about solving the problems put in front of us. We also choose which problems to spend time on. Sometimes the problem itself changes as we work on it. We realize that what we defined as success at the beginning isn't so important anymore.

Imagine you're trying to improve a result in your research. While examining the results, you notice something strange. You don't need to deal with it to reach your original goal; it'll actually slow you down. But you're curious, so you follow it. Eventually, you realize that's where the real value of the work was.

Judged against the original goal, you went off track. Good thing you did. If you'd followed your initial plan to the letter, you'd have walked right past the most interesting part of the work.

There is [research](https://proceedings.mlr.press/v119/wang20l.html) on systems that generate their own goals and move between different problems. So I'm not saying changing goals with RL is impossible. What bothers me is this appetite for completing tasks in the agents I use. They're very eager to finish something. When it comes to discussing whether that thing is still worth doing, I don't see the same ability.

## What Are We Optimizing?

The exploration–exploitation distinction comes to mind here. Roughly, trying new things to learn where the value is, and making use of the value you've found.

The difference I experience with AI resembles this. If I know what I want, I get tremendous help obtaining it. But when we try to think together about which direction is worth taking, things fall apart. It's very good when you tell it what to do; it's not nearly as good when you want to discuss what's worth doing.

Is it because it can't generate ideas? No, they're very generous with ideas. Ask for fifty and you'll get fifty. If that's not enough, you can have a hundred. And every one of them is “promising,” every one has something worth working on. (If they're all so promising, why don't I want to work on any of them?)

I don't need a hundred ideas. I want to understand why one of them is actually worth pursuing. Which one has something to it, and which one just sounds nice? Where could I spend my time and learn something meaningful?

I'm using exploration in a slightly broader sense here. Along with trying different ways of reaching a known goal, we're poking at the goal itself. Our idea of what matters can change.

In a way, **we're trying to figure out what's worth optimizing.**

I think this is what I feel is missing in research. If I explain properly which direction AI should take, it moves very fast. But sometimes I don't know the direction either. I'm having the conversation to find it together. When it asks me again where I want to go, we're back where we started.

## Isn't There a Skill for This?

So can't we write this as a skill too? After all, what needs to happen seems fairly clear: if there's uncertainty, explore a bit, consider alternatives, question the goal if necessary. If something looks interesting, don't dismiss it right away; don't be afraid to change direction, and so on.

Of course we can write that. But who's going to figure out the “if necessary” in that instruction?

When should we keep at it a little longer? When should we drop this idea? Is the thing we find interesting right now actually interesting, or does it just seem that way because we don't understand it yet? Is this tangent teaching us something, or are we avoiding work? (That's possible too. Let's not fool ourselves.)

We can't sort these things out by saying “first, list three alternatives.”

In fact, with a skill like that, we might experience the same problem in a more organized way. Alternatives come out, pros and cons get written down, an option gets recommended. There's a beautifully tidy table in front of us. But when we look back, we still don't understand why we should pursue that option. A lot has been written, and we haven't learned much.

This is the judgment I'm looking for. Understanding when to clarify, when to keep exploring, and when to change direction. I don't think it can't be learned. But writing down the procedure and putting it in a file doesn't mean we've given the system that judgment too.

Because sometimes you need to spend a little time with an idea to see its value. If you expect it to prove itself from the start, you never give it that chance. Maybe it really will turn out to be empty. Maybe it'll broaden your perspective and raise other questions. Or maybe you'll understand why that thing you couldn't describe at the beginning of the post kept nagging at you. Finding that out takes time too.

## So Who's the Bottleneck?

When I started this post, my answer was more definite: we are.

For a significant part of my own use, I still think so. I can't keep up with AI. My knowledge, attention, and the way I express myself limit how much I can get out of it. Improving those is my job, and getting annoyed at the model isn't much use here.

But in research, I no longer think it makes sense to blame myself for every failure by saying “I wasn't clear enough.” Sometimes I can't explain it clearly because the thought isn't clear yet. That's the nature of some processes: the thought emerges over time, uncertainty gets resolved step by step, back and forth, rather than all at once. I'm there to develop my thinking in the first place. If you expect me to make everything clear from the start, you're making me do the part we're supposed to do together all by myself!

That's what I expect from a good thinking partner. Don't immediately turn everything I say into a plan, reject it outright, or immediately test it against a rubric. And I don't need it constantly agreeing with me with “you're absolutely right” either (sycophancy)! Be able to stay with an idea, challenge it, see its connection to something else. Let's return to the original question if we need to, or drop it if we need to. Let's not try to finish the work before we've even figured out what we're curious about!

When I was preparing this post, I wanted to explain the idea that “humans are the bottleneck” properly. Then I got caught up in the way I was talking to AI itself. Instead of answering its questions, I started explaining why I didn't want to answer them. A significant part of the post came out that way.

Now, if I remove that “detour,” half of what I want to say disappears. Maybe I could have finished the post I originally planned faster, but I wouldn't have written what I think now, or *what I actually meant*.

Sometimes you figure out where you want to go as you talk. What I want from AI is for it to be there with me for that part too.
