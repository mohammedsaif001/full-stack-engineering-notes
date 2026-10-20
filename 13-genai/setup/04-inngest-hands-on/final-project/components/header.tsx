"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth/client";
import { Menu, Search } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { data: session, isPending } = useSession();

  return (
    <header className="relative border-b border-border">
      <div className="px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between gap-4 h-16 md:h-20">
            {/* Logo */}
            <div className="min-w-0 flex-1">
              <Link
                href="/"
                className="text-lg sm:text-xl font-outfit font-bold text-foreground truncate"
              >
                DevQuery Forum
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex">
              <ul className="flex items-center whitespace-nowrap font-semibold text-[15px]">
                <li className="py-2">
                  <Link
                    href="/questions"
                    className="px-4 lg:px-6 text-foreground hover:underline hover:decoration-muted underline-offset-4 transition-colors"
                  >
                    Questions
                  </Link>
                </li>
                <li className="py-2">
                  <Link
                    href="/search"
                    className="px-4 lg:px-6 inline-flex items-center gap-2 text-foreground hover:underline hover:decoration-muted underline-offset-4 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    <span>Search</span>
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Actions */}
            <div className="hidden md:flex flex-1 items-center justify-end gap-3">
              <Link href="/questions/ask">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  Ask Question
                </Button>
              </Link>

              {isPending ? (
                <Button variant="outline" disabled className="text-sm">
                  Loading...
                </Button>
              ) : session?.user ? (
                <div className="flex items-center gap-3">
                  <Link href={`/users/${session.user.id}`}>
                    <span className="text-sm font-medium text-muted-foreground hover:text-foreground">
                      {session.user.name}
                    </span>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => signOut()}
                    className="text-sm"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/auth/signin">
                    <Button variant="outline" className="text-sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button variant="ghost" className="text-sm">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-border text-foreground"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 p-2 space-y-1"
                  sideOffset={8}
                >
                  <DropdownMenuItem asChild>
                    <Link href="/questions" className="w-full">
                      Questions
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/search"
                      className="w-full inline-flex items-center gap-2"
                    >
                      <Search className="h-4 w-4" />
                      <span>Search</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/questions/ask" className="w-full">
                      Ask Question
                    </Link>
                  </DropdownMenuItem>
                  {isPending ? (
                    <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                  ) : session?.user ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/users/${session.user.id}`}
                          className="w-full"
                        >
                          {session.user.name}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => signOut()}>
                        Sign Out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/auth/signin" className="w-full">
                          Sign In
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/auth/signup" className="w-full">
                          Sign Up
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
