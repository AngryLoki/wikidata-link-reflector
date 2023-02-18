<script lang="ts">
    import type { MatchingDatabase } from "$lib/matching-database";
    import { onMount } from "svelte";

    let buildMatchingDatabaseResult: MatchingDatabase;

    // onMount(async () => {
    //     buildMatchingDatabaseResult = await getCachedMatchingDatabase();
    // });
</script>

<h1>Matching database</h1>

{#if buildMatchingDatabaseResult}
    {#each Object.entries(buildMatchingDatabaseResult.rules) as [propertyId, { manualMatchers }]}
        {#if manualMatchers}
            <div>
                <h3 class="text-xl">{propertyId}</h3>
                <ul>
                    {#each manualMatchers as manualMatcher}
                        <li>
                            {JSON.stringify(manualMatcher)}
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    {/each}
{:else}
    Loading...
{/if}
