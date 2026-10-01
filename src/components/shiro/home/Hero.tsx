'use client'
// Adapted from Innei/Shiro 891bb24cd59aff7c9baaf4d9a3579ca4275da3b7 (AGPL-3.0).
// Source: app/[locale]/(home)/components/Hero.tsx; SiteSettings props, removed remote quotes.
import clsx from 'clsx'
import { motion as m } from 'motion/react'
import Image from 'next/image'
import type { SiteSetting } from '@/payload-types'
import { cn as clsxm } from '@/utilities/ui'
import { softBouncePreset } from '../ui/spring'
import { BottomToUpTransitionView } from '../ui/Transition'
import { TwoColumnLayout } from './TwoColumnLayout'
export function Hero({ site }: { site: SiteSetting }) {
  const avatar =
    site.brandImage && typeof site.brandImage === 'object' && site.brandImage.url
      ? site.brandImage.url
      : '/favicon.svg'
  return (
    <div className="mx-auto mt-20 min-w-0 max-w-7xl overflow-hidden lg:mt-[-4.5rem] lg:h-dvh lg:min-h-[800px] lg:px-8">
      <TwoColumnLayout
        leftContainerClassName="mt-[120px] lg:mt-0 lg:h-[15rem] lg:h-1/2"
        rightContainerClassName="lg:flex lg:justify-end lg:items-end"
      >
        <>
          <m.div
            className="group relative text-center leading-[4] lg:text-left [&_*]:inline-block"
            initial={{ opacity: 0.0001, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={softBouncePreset}
          >
            <h1 className="text-4xl font-medium leading-tight lg:text-5xl">{site.title}</h1>
          </m.div>

          <BottomToUpTransitionView
            delay={200}
            transition={softBouncePreset}
            className="my-3 text-center lg:text-left"
          >
            <span className="opacity-80">{site.description}</span>
          </BottomToUpTransitionView>

          <ul className="center mx-[60px] mt-8 flex flex-wrap gap-4 gap-y-6 lg:mx-auto lg:mt-28 lg:justify-start lg:gap-y-4">
            {site.socialLinks?.map((link, index) => (
              <BottomToUpTransitionView key={link.id || link.url} delay={index * 100 + 300} as="li">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm opacity-80 transition-colors hover:text-accent"
                >
                  {link.label} ↗
                </a>
              </BottomToUpTransitionView>
            ))}
          </ul>
        </>

        <div className={clsx('lg:size-[300px]', 'size-[200px]', 'mt-24 lg:mt-0')}>
          <Image
            unoptimized
            height={300}
            width={300}
            src={avatar}
            alt={site.title}
            className={clsxm(
              'aspect-square rounded-full border border-slate-200 dark:border-neutral-800',
              'w-full',
            )}
          />
        </div>

        <m.div
          initial={{ opacity: 0.0001, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={softBouncePreset}
          className={clsx(
            'center inset-x-0 bottom-0 mt-12 flex flex-col lg:absolute lg:mt-0',

            'center text-neutral-800/80 dark:text-neutral-200/80',
          )}
        >
          <a href="#recent-posts" aria-label="查看最近文章" className="mt-8 animate-bounce">
            <i className="i-mingcute-right-line rotate-90 text-2xl" />
          </a>
        </m.div>
      </TwoColumnLayout>
    </div>
  )
}
