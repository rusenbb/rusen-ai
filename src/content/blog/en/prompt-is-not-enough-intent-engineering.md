---
title: "Prompt Is Not Enough: Intent Engineering"
date: "2026-03-12"
description: "Can the distance between human intent and model behavior really be closed with prompts alone? In long and risky workflows, what does it take to preserve intent? Let me introduce you to Intent Engineering."
tags:
  - "ai"
  - "programming"
  - "agents"
  - "prompt"
  - "intent engineering"
translationKey: "intent-engineering"
seriesId: "ai-programming"
seriesOrder: 3
---

# Prompt Is Not Enough

In my earlier posts, if you remember, I kept emphasizing one thing: if we give AI agents the "necessary" context, they can probably do many tasks better than any of us can (sad, I know :c). But giving that "necessary" context is not always easy. Especially in long-running and complex tasks, a prompt alone may not be enough to preserve intent and keep the model moving in the right direction. Models already try to use their tools properly in order to pull the information they need from the environment, we all know that. But in many cases, the commands we give do not fully reflect our "intent"; they only reflect our "request." So the model tends to produce outcomes that satisfy the request, not necessarily the deeper intent behind it.

Think of it this way: when you give a model command A, or prompt A, it can fulfill it in X different ways. But if I showed you those X different outcomes at the end, you would probably have a favorite. Or at the very least, you could say there are some approaches you definitely would not want. But where would the model get that information? The model only sees command A. It cannot see the intent underneath it. That is why the outputs it generates sometimes reflect only what we asked for, not what we actually meant.

Prompt engineering, roughly speaking, is the craft of expressing our request clearly.  
Intent engineering is dealing with a different problem: making sure what the model produces lands in the right place inside a larger system.

So the issue is not just getting a "good answer."  
It is getting a good answer according to the right criteria.

And those criteria cannot always be solved by writing more into the prompt.  
Sometimes prompt is not enough.  
Sometimes the system has to enforce certain things independently of the model.  
Sometimes the model has to know in advance where it must stop.

> A command is one thing, intent is another.

Intent is not always something that can be fully expressed in words in one shot. *Intent is part of the process itself*, and at every step of that process, we may need different techniques to preserve it and keep the model going in the right direction. Prompt engineering is only one of those techniques: it helps steer the beginning of the process well. Intent engineering covers all the techniques used to preserve intent and keep the model aligned *throughout the process*.

## What I Mean by Intent Engineering

So how is this different from context engineering? The term "Context Engineering," which Andrej Karpathy popularized, is about enabling the model to access the information it needs, or may need, from its environment. The relationship there is model-to-task. The goal is to make sure the model can retrieve relevant information about the job it is doing. Intent engineering is about a different relationship: model-to-human. It tries to make the model understand the intent behind what the human expressed as a command, and act according to that intent, or at least not act against it.

One is closer to memory.  
The other is closer to a sense of direction.

So how does intent engineering work in practice?

To answer that, we first need to understand why intent and command cannot be the same thing from the beginning. Why can we not just cram every constraint into one giant system prompt, then add the user request on top and call it done?

Because intent is often not fully known at the start.

People say the thing they think they want.  
What they do not want usually becomes clear only after they see a bad outcome.

That is why the fantasy of a one-shot perfect prompt is a little romantic.  
The problem is not that we do not know how to write prompts.  
The problem is that intent is something that reveals itself during the process.

You can guide a model very well at the start.  
But as the process gets longer, new information arrives, new risks appear, and some preferences start to look worse.  
The model, meanwhile, keeps trying to stay faithful to the command it has seen so far.

That is where the break happens:  
faithfulness to the command and faithfulness to the intent are not the same thing.

## Big Companies Were Already Living This Problem

We are not really talking about a new problem here.  
We are just reliving an old problem with a new actor.

Big technology companies have known this for years: you cannot manage a large codebase with good engineers alone. If your only foundation is "people will make the right decision," the system eventually starts to fall apart. Because as scale grows, the intent inside everyone's head drifts apart. Everyone may look like they are doing their part, but the total behavior that emerges can still be wrong.

That is why big companies do not manage software with code alone. They manage it with process. With boundaries. With friction.

That is what code review is for.  
That is what CI is for.  
That is what tests are for.  
Type systems, lint rules, code ownership, RFC processes, staging environments, rollout strategies, approval mechanisms... none of these were invented to insult developers. They were invented to prevent intent from being corrupted along the way.

Because in a large system, the problem is this: it is not enough to tell someone "do this."  
The real questions are: what must they never break while doing it?  
Where must they stop?  
Which changes should be rejected automatically?  
Which risks should never pass without human eyes on them?

That is why large codebases are governed not by prompts, but by protocols.

I think this is the important analogy: what we are rediscovering today for agent systems is something large software organizations have known for years. Intent is not just a sentence spoken at the beginning. Intent is something that has to be embedded into the process. If you do not embed it, the system may look correct at first glance, but over time it starts optimizing for the wrong thing.

The model is similar.  
You can give it a beautiful prompt at the start.  
But in a long task, in a multi-file system, in a risky operation, a one-shot instruction is not enough. Because the model is constantly making local decisions: which file should I read, what should I assume, what should I change, what should I skip, when should I stop? If there is no system around those decisions that preserves intent, the model often goes in the wrong direction not because it is malicious, but because it is too obedient.

So the issue is not only whether the model is smart.  
The issue is which rails that intelligence is running on.

## Programming Was Always Intent Engineering

This is not something entirely new.

The history of programming is, in part, the history of this question:  
how do we translate the intent in a human mind into a form a machine can execute?

Assembly is the primitive form of that.  
C is a slightly more human layer.  
Frameworks package recurring intent.  
APIs define boundaries.  
Type systems reject some malformed expressions of intent before they even run.  
Tests verify later that "this is what I meant."  
Code review checks whether intent survived the trip not only to the machine, but also to other humans.

Programming was never just about writing commands.  
It was always an effort to express intent more reliably.

From that angle, prompts are not some alien new thing.  
They are just a more naked, more defenseless face of the same problem.

## Why AI Exposed This So Hard

Because classical software systems demanded precision from you.

A compiler does not like ambiguity.  
A type checker does not try to guess what you meant.  
Tests do not politely declare a broken thing "approximately correct."

An LLM is different.  
It does not only ask you for specification, it also asks for direction.  
It fills in gaps. It assumes. It interprets. That is exactly why it is powerful.

And that is exactly why it is dangerous.

Because this is where humans are weakest:  
we think we know what we want, but most of the time we only understand what we really wanted after we see the wrong result.

In classical software, that weakness hit the wall earlier.  
With LLMs, things can appear to be working for a while.

That is why prompt is not enough.

The problem is not that we do not know how to write prompts.  
The problem is that intent is not something that can be stated completely, once and for all, in a single shot.

## The Unexpected Result: Why Programming Will Not Die

Maybe the phrase "prompt engineering" was a little incomplete from the start.

Because the issue is not writing pretty sentences to a model.  
The issue is building a system that will not lose intent as the process unfolds.

Prompt is part of that.  
But it is only one part.

Just as programming languages, type systems, tests, and review processes were never enough on their own, prompt will not be enough either.

Because command is one thing, intent is another.

And throughout the history of software, the truly hard problem was always the same:  
the distance between what a human means and what the system actually does.

That distance seems to shrink more every day, but if we are still debating it, can it really go all the way to zero?

Will there really be a day when someone arrives, says nothing, and the tree already knows?

Or will there always be some amount of intent engineering?
