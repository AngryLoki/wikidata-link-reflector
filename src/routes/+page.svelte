<script lang="ts">
  import Field from "$lib/components/common/Field.svelte";
  import Heading2 from "$lib/components/common/Heading2.svelte";
  import InlineEdit from "$lib/components/common/InlineEdit.svelte";
  import type { ReflectResponse } from "./api/v1/reflect/+server";

  let url =
    "https://commons.wikimedia.org/wiki/File:H._J._Townsend_-_Where_the_Bea_Sucks._The_Tempest,_Act_3,_Scene_1._Fairy_in_Hammock_of_Convolvulus._-_B1977.14.13207_-_Yale_Center_for_British_Art.jpg";
  let result: Promise<ReflectResponse> | undefined;

  $: result = updateResult(url);

  const updateResult = async (url: string) => {
    const response = await fetch(
      "/api/v1/reflect?" + new URLSearchParams({ url }).toString()
    );
    return response.json();
  };
</script>

<div class="container mx-auto p-4">
  <Heading2 class="mb-8">Wikidata Link Reflector</Heading2>

  <div class="mb-8">
    <a href="/api/index.html" class="text-blue-600 hover:underline">
      API documentation
    </a>
  </div>

  <div class="mb-8">
    <Field label="Url"><InlineEdit bind:value={url} /></Field>
  </div>

  {#if result}
    {#await result}
      loading...
    {:then matches}
      <div class="p-4 bg-gray-950">
        <div class="p-2">
          Database refresh time: {new Date(
            matches.refreshDate
          ).toLocaleString()}
        </div>

        <div class="grid  grid-cols-[200px_minmax(0,_1fr)]">
          {#each matches.items as item}
            <div class="p-2">{item.label} ({item.id})</div>
            <div class="p-2">{item.value}</div>
          {/each}
        </div>
      </div>
    {/await}
  {/if}
</div>
