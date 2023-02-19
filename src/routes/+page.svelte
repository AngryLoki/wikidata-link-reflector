<script lang="ts">
  import Button from "$lib/components/common/Button.svelte";
  import Field from "$lib/components/common/Field.svelte";
  import Heading2 from "$lib/components/common/Heading2.svelte";
  import InlineEdit from "$lib/components/common/InlineEdit.svelte";
  import Spinner from "$lib/components/common/Spinner.svelte";
  import type {
    ReflectResponse,
    ReflectResponseError,
  } from "./api/v1/reflect/+server";

  let url = "";

  let examples = [
    "https://commons.wikimedia.org/wiki/File:Example.png",
    "https://commons.wikimedia.org/wiki/File:Example.webm",
    "https://commons.wikimedia.org/wiki/File:Example.pdf",
    "https://www.imdb.com/name/nm7828430/",
    "https://steins-gate.fandom.com/wiki/Kurisu_Makise",
    "https://www.facebook.com/papoyangarik",
    "https://viaf.org/viaf/35930728/",
  ];

  $: responsePromise = updateResult(url);

  const updateResult = async (url: string) => {
    const response = await fetch(
      "/api/v1/reflect?" + new URLSearchParams({ url }).toString()
    );
    return response.json() as Promise<ReflectResponse>;
  };

  const isError = (result: ReflectResponse): result is ReflectResponseError => {
    return (result as ReflectResponseError).message !== undefined;
  };
</script>

<div class="container mx-auto p-4">
  <Heading2 class="mb-8">Wikidata Link Reflector</Heading2>

  <div class="mb-4 flex flex-wrap gap-4">
    <a
      href="https://github.com/AngryLoki/wikidata-link-reflector"
      target="_blank"
      rel="noopener noreferrer">Source code</a
    >
    <a href="/api/index.html"> API documentation </a>
    <a
      href="https://grafana.wmcloud.org/d/TJuKfnt4z/kubernetes-namespace?orgId=1&var-cluster=prometheus-tools&var-namespace=tool-reflector&from=now-7d&to=now"
      target="_blank"
      rel="noopener noreferrer"
    >
      Status dashboard
    </a>
  </div>

  <div class="mb-8">
    <div class="mb-2">Examples to try:</div>
    <div class="flex flex-wrap gap-1">
      {#each examples as example}
        <Button
          class="block bg-gray-700 px-2 py-1 rounded-sm"
          on:click={() => {
            url = example;
          }}
        >
          {example}
        </Button>
      {/each}
    </div>
  </div>

  <div class="mb-2">Form for testing:</div>
  <div class="mb-8 bg-gray-950 rounded-sm p-4">
    <Field label="Url"><InlineEdit bind:value={url} /></Field>
  </div>

  {#if responsePromise}
    {#await responsePromise}
      <Spinner class="w-20 h-20" />
    {:then response}
      {#if isError(response)}
        <div class="p-4 bg-red-900/40 rounded-sm">
          {response.message}
        </div>
      {:else}
        <div class="mb-2">Matching results:</div>
        <div class="p-4 bg-gray-950 rounded-sm">
          {#if response.items.length > 0}
            <div class="grid  grid-cols-[fit-content(40%)_minmax(0,_1fr)] mb-4">
              {#each response.items as item}
                <div class="p-2">
                  <a
                    href="https://www.wikidata.org/wiki/Property:{item.id}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.label}
                  </a>
                  ({item.id})
                </div>

                <div class="p-2">
                  {#if item.link}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.value}
                    </a>
                  {:else}
                    {item.value}
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            No results
          {/if}

          <div class="p-2 text-sm text-gray-400">
            Database refresh time: {new Date(
              response.refreshDate
            ).toLocaleString()}
          </div>
        </div>
      {/if}
    {/await}
  {/if}
</div>

<style lang="postcss">
  a {
    @apply text-blue-400 hover:underline;
  }
</style>
