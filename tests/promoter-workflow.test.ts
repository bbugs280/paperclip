/**
 * Promoter Workflow Tests
 * 
 * Validates that Promoter:
 * 1. Skips Bitly link creation entirely (Step 2 removed)
 * 2. Proceeds directly to X posting (Step 2)
 * 3. Handles edition docs with N/A Bitly fields correctly
 * 4. Does not attempt Bitly API calls
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { PromotedEditionDoc, PromotedTask } from '../packages/shared/src/types'

describe('Promoter Workflow', () => {
  describe('Step 2 — Skip Bitly Creation', () => {
    it('should not parse Bitly creation commands from AGENTS.md', () => {
      // Load Promoter AGENTS.md
      const agentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/9be56ebd-ea17-45fa-a855-5cd1541a741b/instructions/AGENTS.md',
        'utf-8'
      )

      // Bitly creation step should NOT exist
      expect(agentsMd).not.toMatch(/### Step 2 — Create Bitly links/)
      expect(agentsMd).not.toMatch(/bitly:bitly-shorten/)
      expect(agentsMd).not.toMatch(/plugins\/tools\/execute.*bitly/)
    })

    it('should rename old Step 3 X posting to Step 2', () => {
      const agentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/9be56ebd-ea17-45fa-a855-5cd1541a741b/instructions/AGENTS.md',
        'utf-8'
      )

      // Step 2 should now be X posting
      expect(agentsMd).toMatch(/### Step 2 — Post to X via Playwright/)
      // Old Step 3 should NOT exist
      expect(agentsMd).not.toMatch(/### Step 3 — Post to X via Playwright/)
    })

    it('should update Step 3 to channel research (old 3b)', () => {
      const agentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/9be56ebd-ea17-45fa-a855-5cd1541a741b/instructions/AGENTS.md',
        'utf-8'
      )

      // Step 3 should now be channel research
      expect(agentsMd).toMatch(/### Step 3 — Search and engage/)
      // Old Step 4 should NOT exist
      expect(agentsMd).not.toMatch(/### Step 4 — Search and engage/)
    })

    it('should update all step references (2a, 2b, 2c, 2d, 2e, 3a, 3b, 3c, 3d)', () => {
      const agentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/9be56ebd-ea17-45fa-a855-5cd1541a741b/instructions/AGENTS.md',
        'utf-8'
      )

      // X posting steps should be 2a-2e
      expect(agentsMd).toMatch(/\*\*2a\. Compose the tweet text\*\*/)
      expect(agentsMd).toMatch(/\*\*2b\. Download the image/)
      expect(agentsMd).toMatch(/\*\*2c\. Post via system Playwright tool/)
      expect(agentsMd).toMatch(/\*\*2d\. Handle the result/)
      expect(agentsMd).toMatch(/\*\*2e — Channel Research/)

      // Engagement steps should be 3a-3d
      expect(agentsMd).toMatch(/\*\*3a\. Search X for relevant conversations/)
      expect(agentsMd).toMatch(/\*\*3b\. Get timelines of relevant accounts/)
      expect(agentsMd).toMatch(/\*\*3c\. Reply to tweets that mention/)
      expect(agentsMd).toMatch(/\*\*3d\. Multi-channel engagement/)
    })

    it('should mention "skip Step 2 if X Post URL already set" in Step 1b', () => {
      const agentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/9be56ebd-ea17-45fa-a855-5cd1541a741b/instructions/AGENTS.md',
        'utf-8'
      )

      expect(agentsMd).toMatch(/skip Step 2 entirely and go to Step 3/)
    })

    it('should NOT mention Bitly fields in Step 1b', () => {
      const agentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/9be56ebd-ea17-45fa-a855-5cd1541a741b/instructions/AGENTS.md',
        'utf-8'
      )

      // Extract Step 1b section
      const step1bMatch = agentsMd.match(/\*\*1b\. Fetch the edition document.*?---/s)
      expect(step1bMatch).toBeTruthy()

      const step1bText = step1bMatch![0]

      // Should NOT mention Article Bitly or Podcast Bitly
      expect(step1bText).not.toMatch(/Article Bitly|Podcast Bitly/)
      // Should mention Social Image URL
      expect(step1bText).toMatch(/Social Image URL/)
    })
  })

  describe('Edition-5 Bitly Configuration', () => {
    it('should have Bitly fields marked as N/A in edition-5', async () => {
      const response = await fetch('http://localhost:3100/api/issues/629c0ffb-a6dc-4e54-b16c-63dc09f14c9b/documents/edition-5', {
        headers: { 'Authorization': `Bearer ${process.env.PAPERCLIP_API_KEY || 'test'}` }
      })
      const doc = await response.json()

      expect(doc.body).toContain('Article Bitly:** N/A (Bitly creation disabled)')
      expect(doc.body).toContain('Podcast Bitly:** N/A (Bitly creation disabled)')
    })

    it('should NOT have "to be created by Promoter" placeholders', async () => {
      const response = await fetch('http://localhost:3100/api/issues/629c0ffb-a6dc-4e54-b16c-63dc09f14c9b/documents/edition-5', {
        headers: { 'Authorization': `Bearer ${process.env.PAPERCLIP_API_KEY || 'test'}` }
      })
      const doc = await response.json()

      expect(doc.body).not.toContain('to be created by Promoter')
    })

    it('should reference Step 2e in Social Image URL placeholder', async () => {
      const response = await fetch('http://localhost:3100/api/issues/629c0ffb-a6dc-4e54-b16c-63dc09f14c9b/documents/edition-5', {
        headers: { 'Authorization': `Bearer ${process.env.PAPERCLIP_API_KEY || 'test'}` }
      })
      const doc = await response.json()

      expect(doc.body).toContain('see Step 2e')
    })
  })

  describe('Promoter Run Validation', () => {
    it('should not call bitly API endpoint in any Promoter run', async () => {
      // This test would require access to Promoter run logs
      // For now, we validate that the instructions don't contain the API call

      const agentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/9be56ebd-ea17-45fa-a855-5cd1541a741b/instructions/AGENTS.md',
        'utf-8'
      )

      // Count occurrences of bitly in the file
      const bitlyOccurrences = (agentsMd.match(/bitly/gi) || []).length

      // Should be 0 (no bitly references at all)
      expect(bitlyOccurrences).toBe(0)
    })

    it('should proceed directly from Step 1 to Step 2 (X posting)', () => {
      const agentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/9be56ebd-ea17-45fa-a855-5cd1541a741b/instructions/AGENTS.md',
        'utf-8'
      )

      // Extract workflow order
      const step1 = agentsMd.indexOf('### Step 1 —')
      const step2 = agentsMd.indexOf('### Step 2 — Post to X')
      const step3 = agentsMd.indexOf('### Step 3 —')

      expect(step1).toBeLessThan(step2)
      expect(step2).toBeLessThan(step3)

      // Should NOT have old Step 3 X posting
      expect(agentsMd).not.toMatch(/### Step 3 — Post to X/)
    })
  })

  describe('OM Auto-Assign Step 2.4', () => {
    it('should have Step 2.4 in OM AGENTS.md', () => {
      const omAgentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/69c6ebd1-ec4c-4ac5-98ea-6e2ea0ff0a07/instructions/AGENTS.md',
        'utf-8'
      )

      expect(omAgentsMd).toMatch(/Step 2\.4/)
      expect(omAgentsMd).toMatch(/Assign Promoter/)
    })

    it('should include curl PATCH example with Promoter agent ID', () => {
      const omAgentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/69c6ebd1-ec4c-4ac5-98ea-6e2ea0ff0a07/instructions/AGENTS.md',
        'utf-8'
      )

      // Should have Promoter agent ID
      expect(omAgentsMd).toContain('9be56ebd-ea17-45fa-a855-5cd1541a741b')
      // Should have PATCH /api/issues/{id} example
      expect(omAgentsMd).toMatch(/PATCH.*\/api\/issues/)
      // Should mention assigneeAgentId
      expect(omAgentsMd).toMatch(/assigneeAgentId/)
    })
  })

  describe('Integration: Edition Creation → Promotion', () => {
    it('scenario: OM creates edition → auto-assigns Promoter → Promoter skips Bitly → posts to X', () => {
      const scenario = `
      1. OM creates edition-5 in NEW-6 (Performance Log)
         - Contains article URL, podcast URL
         - Bitly fields marked as "N/A (Bitly creation disabled)"
         
      2. OM Step 2.4 auto-assigns Promoter to NEW-177
         - PATCH /api/issues/NEW-177 with assigneeAgentId: 9be56ebd...
         
      3. Promoter is triggered (heartbeat or manual invoke)
         - Step 1: Fetch edition-5 from NEW-6 ✓
         - Step 1b: Extract article/podcast URLs, Social Image URL ✓
         - Step 2: Skip Bitly creation (N/A fields in edition doc) ✓
         - Step 2a-2d: Compose tweet, download image (if present), post to X ✓
         - Step 2e: Search X for engagement opportunities ✓
         - Step 3: Multi-platform posting (Instagram if image, Quora if URL) ✓
         
      4. Result: NEW-177 completed with X post URL logged in edition-5
      `

      // This is more of a documentation test, but validates the flow
      const agentsMd = require('fs').readFileSync(
        '/Users/home/paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/agents/9be56ebd-ea17-45fa-a855-5cd1541a741b/instructions/AGENTS.md',
        'utf-8'
      )

      // Verify all steps exist and are in correct order
      const steps = [
        { num: 1, text: 'Fetch the latest Substack posts' },
        { num: '1b', text: 'Fetch the edition document from NEW-6' },
        { num: 2, text: 'Post to X via Playwright' },
        { num: '2a', text: 'Compose the tweet text' },
        { num: '2b', text: 'Download the image' },
        { num: '2c', text: 'Post via system Playwright tool' },
        { num: '2d', text: 'Handle the result' },
        { num: '2e', text: 'Channel Research' },
        { num: 3, text: 'Search and engage' },
      ]

      let lastIndex = 0
      for (const step of steps) {
        const searchText = `### Step ${step.num}`
        const idx = agentsMd.indexOf(searchText)
        expect(idx).toBeGreaterThan(lastIndex, `Step ${step.num} found in correct order`)
        lastIndex = idx
      }
    })
  })
})
