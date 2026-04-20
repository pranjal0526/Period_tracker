"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  role: "assistant" | "user";
  content: string;
};

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "I’m Ember. Ask about cycle timing, symptoms, mood patterns, or how to talk to a clinician about what you’ve noticed. We can take it one gentle step at a time.",
  },
];

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    const nextMessage = message.trim();
    setMessages((current) => [...current, { role: "user", content: nextMessage }]);
    setMessage("");

    startTransition(async () => {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: nextMessage }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              payload?.error ??
              "I hit a temporary snag reaching the assistant service. Try again in a moment.",
          },
        ]);
        return;
      }

      const data = (await response.json()) as { reply?: string };
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            data.reply ??
            "I couldn’t form a useful answer just then, but I’m still here to help.",
        },
      ]);
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Ask Ember</CardTitle>
        <CardDescription>
          A supportive assistant for trends, reflections, and practical next questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[460px] space-y-3 overflow-y-auto rounded-[28px] bg-card p-4">
          {messages.map((entry, index) => (
            <div
              key={`${entry.role}-${index}`}
              className={`max-w-full rounded-[24px] px-4 py-3 text-sm leading-6 sm:max-w-[90%] ${
                entry.role === "assistant"
                  ? "bg-card-strong text-foreground"
                  : "ml-auto bg-primary text-primary-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{entry.content}</p>
            </div>
          ))}
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Textarea
            placeholder="What should I pay attention to this cycle?"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Thinking..." : "Send message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
