import { Nav } from "./(marketing)/_components/nav";
import { Hero } from "./(marketing)/_components/hero";
import { Problem } from "./(marketing)/_components/problem";
import { Solution } from "./(marketing)/_components/solution";
import { Architecture } from "./(marketing)/_components/architecture";
import { UseCases } from "./(marketing)/_components/use-cases";
import { Roadmap } from "./(marketing)/_components/roadmap";
import { Personas } from "./(marketing)/_components/personas";
import { CTA } from "./(marketing)/_components/cta";
import { Footer } from "./(marketing)/_components/footer";
import { Marquee } from "@/components/ui/marquee";

const agentTags = [
  "seo.brief",
  "copywrite.v3",
  "design.figma",
  "code.next",
  "deploy.v0",
  "sol-audit",
  "research.pro",
  "ads.meta",
  "translate.42",
  "vision.ocr",
  "analytics.v2",
  "crawl.v2",
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <Nav />
      <Hero />
      <Marquee items={agentTags} />
      <Problem />
      <Solution />
      <Architecture />
      <UseCases />
      <Roadmap />
      <Personas />
      <CTA />
      <Footer />
    </main>
  );
}
