import { readFile } from "fs/promises";
import { join } from "path";
import Link from "next/link";
import { marked } from "marked";
import PolicyHeader from "../PolicyHeader";

async function getPrivacyPolicyContent() {
  try {
    const filePath = join(process.cwd(), "policies", "privacy", "v0.2.0-2026-01-15.md");
    const fileContents = await readFile(filePath, "utf8");
    return fileContents;
  } catch (error) {
    console.error("Error reading privacy policy:", error);
    return null;
  }
}

export default async function PrivacyPolicyPage() {
  const markdownContent = await getPrivacyPolicyContent();
  // Configure marked to handle links properly
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
  const htmlContent = markdownContent ? marked.parse(markdownContent) : "<p>Privacy Policy not available.</p>";

  return (
    <div className="min-h-screen flex flex-col bg-orange-50">
      <PolicyHeader />

      {/* Content */}
      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 md:p-12">
          <div
            className="markdown-content font-inter text-gray-800 dark:text-zinc-200"
            style={{
              lineHeight: "1.75",
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
          
          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-orange-100 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <Link
                href="/"
                className="text-orange-600 hover:text-orange-700 font-semibold underline"
              >
                ← Back to Home
              </Link>
              <a
                href="https://github.com/pran-av/OpenToWork"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 font-semibold underline"
              >
                Review Policy Versions
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-white/80 backdrop-blur-sm border-t border-orange-100 py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 leading-tight sm:leading-normal">
            <p className="font-inter">
              © 2025 - 2026 Pitch Like This. All rights reserved.
            </p>
            <p className="font-inter">
              Created by{" "}
              <a
                href="https://x.com/pranavdotexe"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 font-semibold underline"
              >
                Pranav
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

