<script lang="ts">
    import type { MatchingDatabase } from "$lib/matching-database";
    import { onMount } from "svelte";

    let buildMatchingDatabaseResult: MatchingDatabase;

    onMount(async () => {
        // buildMatchingDatabaseResult = await getCachedMatchingDatabase();
    });
</script>

<div class="bg-gray-800">
    <div class="container mx-auto p-4">
        <h1 class="text-4xl mb-4">Matching database errors</h1>

        {#if buildMatchingDatabaseResult}
            <div class="space-y-4">
                {#each buildMatchingDatabaseResult.errors as group}
                    <div class="bg-gray-750 rounded p-4">
                        <h3 class="text-xl mb-2">
                            {group.label} ({group.propertyId})
                        </h3>
                        <ul
                            class="rounded divide-y divide-gray-650 border border-gray-650"
                        >
                            {#each group.errors as error}
                                <li
                                    class="bg-gray-700 hover:bg-gray-650 transition-colors first:rounded-t last:rounded-b"
                                >
                                    <a
                                        href="https://www.wikidata.org/wiki/Property:{group.propertyId}#{group.propertyId}${error.statementId}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="block p-2"
                                    >
                                        {error.message}
                                    </a>
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/each}
            </div>
        {:else}
            Loading...
        {/if}
    </div>
</div>
